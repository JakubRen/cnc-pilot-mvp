-- Test funkcji get_my_company_id() dla konkretnego auth_id

SELECT get_my_company_id() as company_id_from_function;

-- Manual check - powinno zwrócić to samo
SELECT company_id
FROM users
WHERE auth_id = '66d7bf9c-8aff-4b0f-a232-1f984803eec9'::UUID;
