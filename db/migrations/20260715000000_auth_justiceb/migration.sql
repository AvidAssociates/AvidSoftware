-- Replace seed test user with the sole production login account.
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = 'test');
DELETE FROM users WHERE email = 'test';

INSERT INTO users (id, email, password_hash, display_name) VALUES
  (
    'usr-justiceb',
    'justiceb@theavidassociates.com',
    '218de70343733e96c579186d275ccbb1:c60cd14c2996b49a34304bb77ad32592c16439d3f4a875862bf55d55e69a2da1c0070e723aac953eeb9ae77d1531fef62196f228d54401bb360b05396dc97291',
    'Justice'
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  display_name = EXCLUDED.display_name;
