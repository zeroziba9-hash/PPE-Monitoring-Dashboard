INSERT INTO safety_managers (employee_id, employee_name, password, safety_manager_flag, created_at, updated_at)
VALUES ('safety-admin', '안전관리자', 'admin1234', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = updated_at;
