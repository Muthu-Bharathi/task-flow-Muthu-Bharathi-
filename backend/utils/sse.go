package utils

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

type SSEMsg struct {
	Type      string      `json:"type"`
	ProjectID string      `json:"project_id"`
	Data      interface{} `json:"data"`
}

type Hub struct {
	Clients    map[chan []byte]bool
	Register   chan chan []byte
	Unregister chan chan []byte
	Broadcast  chan []byte
	mu         sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[chan []byte]bool),
		Register:   make(chan chan []byte),
		Unregister: make(chan chan []byte),
		Broadcast:  make(chan []byte),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client] = true
			h.mu.Unlock()
		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client)
			}
			h.mu.Unlock()
		case message := <-h.Broadcast:
			h.mu.Lock()
			for client := range h.Clients {
				select {
				case client <- message:
				default:
					close(client)
					delete(h.Clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) Notify(msg SSEMsg) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	h.Broadcast <- data
}

func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	messageChan := make(chan []byte)
	h.Register <- messageChan

	defer func() {
		h.Unregister <- messageChan
	}()

	notify := r.Context().Done()

	for {
		select {
		case <-notify:
			return
		case message := <-messageChan:
			fmt.Fprintf(w, "data: %s\n\n", message)
			flusher.Flush()
		}
	}
}
