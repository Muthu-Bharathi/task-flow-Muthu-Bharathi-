-- Insert default user "test@example.com" with password "password123"
-- bcrypt hash of "password123" (cost 12)
INSERT INTO users (id, name, email, password)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Test User',
    'test@example.com',
    '$2b$12$Ti0bRZnIY19I8LuEQLC2ueJWBk1CHGEpBJGT8DUHjWKHv0TUy.Ib2'
) ON CONFLICT DO NOTHING;

-- Insert a default project
INSERT INTO projects (id, name, description, owner_id)
VALUES (
    '660e8400-e29b-41d4-a716-446655440001',
    'Website Redesign',
    'Q2 project to redesign the marketing website.',
    '550e8400-e29b-41d4-a716-446655440000'
) ON CONFLICT DO NOTHING;

-- Insert tasks
INSERT INTO tasks (title, description, status, priority, project_id, assignee_id)
VALUES
    ('Design homepage', 'Create new wireframes for homepage', 'done', 'high', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000'),
    ('Implement auth', 'Add login/register flows', 'in_progress', 'high', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000'),
    ('Add to cart feature', 'Implement add to cart logic', 'todo', 'medium', '660e8400-e29b-41d4-a716-446655440001', NULL);
