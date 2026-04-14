ALTER TABLE tasks ADD COLUMN creator_id UUID REFERENCES users(id) ON DELETE SET NULL;
UPDATE tasks SET creator_id = (SELECT owner_id FROM projects WHERE projects.id = tasks.project_id) WHERE creator_id IS NULL;
ALTER TABLE tasks ALTER COLUMN creator_id SET NOT NULL;
