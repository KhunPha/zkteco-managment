-- V30: Clean up soft-deleted id_numbers so they do not artificially inflate sequence numbers
UPDATE students
SET id_number = id_number || '_del_' || id
WHERE deleted_at IS NOT NULL AND id_number NOT LIKE '%_del_%';

UPDATE employees
SET id_number = id_number || '_del_' || id
WHERE deleted_at IS NOT NULL AND id_number NOT LIKE '%_del_%';
