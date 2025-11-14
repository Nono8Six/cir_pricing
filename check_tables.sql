-- Script pour vérifier les tables nécessaires
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status
FROM (
    SELECT 'import_batches' as table_name
    UNION ALL SELECT 'cir_classifications'
    UNION ALL SELECT 'cir_classification_import_rows'
) as required_tables;
