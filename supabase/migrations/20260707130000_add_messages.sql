/*
  # In-app messaging

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, FK listings) - which listing the conversation is about
      - `sender_id` (uuid, FK auth.users)
      - `recipient_id` (uuid, FK auth.users)
      - `body` (text)
      - `created_at` (timestamptz)
      - `read_at` (timestamptz, nullable)

  2. Security
    - Enable RLS
    - A user can insert a message only as themselves (sender_id = auth.uid())
    - A user can select messages where they are the sender or the recipient
    - A user can update (mark as read) only messages where they are the recipient
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_messages_listing_id ON messages(listing_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send messages as themselves"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can view their own conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Recipients can mark messages as read"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);
