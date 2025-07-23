/*
  # Création des triggers d'audit pour brand_category_mappings

  1. Fonction de trigger
    - `audit_brand_mapping_changes()` pour enregistrer les modifications
    - Gère INSERT, UPDATE, DELETE
    - Enregistre l'état avant/après dans brand_mapping_history

  2. Triggers
    - Trigger BEFORE pour capturer les changements
    - Trigger pour incrémenter la version sur UPDATE

  3. Fonctions utilitaires
    - Fonction pour définir le batch_id courant
    - Fonction pour définir la raison du changement
*/

-- Fonction pour enregistrer les changements dans l'historique
CREATE OR REPLACE FUNCTION audit_brand_mapping_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id uuid;
    current_batch_id uuid;
    change_reason text;
BEGIN
    -- Récupérer l'utilisateur courant
    current_user_id := auth.uid();
    
    -- Si pas d'utilisateur authentifié, utiliser un utilisateur système
    IF current_user_id IS NULL THEN
        -- Utiliser le premier admin trouvé comme utilisateur système
        SELECT id INTO current_user_id 
        FROM profiles 
        WHERE role = 'admin' 
        LIMIT 1;
    END IF;
    
    -- Récupérer le batch_id courant depuis les variables de session
    current_batch_id := nullif(current_setting('app.current_batch_id', true), '');
    
    -- Récupérer la raison du changement depuis les variables de session
    change_reason := coalesce(
        nullif(current_setting('app.change_reason', true), ''),
        CASE TG_OP
            WHEN 'INSERT' THEN 'Manual Insert'
            WHEN 'UPDATE' THEN 'Manual Update'
            WHEN 'DELETE' THEN 'Manual Delete'
        END
    );
    
    -- Permettre l'écriture dans l'historique
    PERFORM set_config('app.writing_to_history', 'true', true);
    
    -- Enregistrer le changement selon le type d'opération
    IF TG_OP = 'DELETE' THEN
        INSERT INTO brand_mapping_history (
            mapping_id,
            old_data,
            new_data,
            change_type,
            changed_by,
            batch_id,
            reason
        ) VALUES (
            OLD.id,
            to_jsonb(OLD),
            NULL,
            'DELETE',
            current_user_id,
            current_batch_id,
            change_reason
        );
        
        -- Réinitialiser la variable
        PERFORM set_config('app.writing_to_history', 'false', true);
        RETURN OLD;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Incrémenter la version
        NEW.version := OLD.version + 1;
        
        INSERT INTO brand_mapping_history (
            mapping_id,
            old_data,
            new_data,
            change_type,
            changed_by,
            batch_id,
            reason
        ) VALUES (
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            'UPDATE',
            current_user_id,
            current_batch_id,
            change_reason
        );
        
        -- Réinitialiser la variable
        PERFORM set_config('app.writing_to_history', 'false', true);
        RETURN NEW;
        
    ELSIF TG_OP = 'INSERT' THEN
        -- Pour les INSERT, nous enregistrerons après l'insertion
        -- car nous avons besoin de l'ID généré
        RETURN NEW;
    END IF;
    
    -- Réinitialiser la variable par sécurité
    PERFORM set_config('app.writing_to_history', 'false', true);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour enregistrer les INSERT (AFTER trigger)
CREATE OR REPLACE FUNCTION audit_brand_mapping_insert()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id uuid;
    current_batch_id uuid;
    change_reason text;
BEGIN
    -- Récupérer l'utilisateur courant
    current_user_id := auth.uid();
    
    -- Si pas d'utilisateur authentifié, utiliser un utilisateur système
    IF current_user_id IS NULL THEN
        SELECT id INTO current_user_id 
        FROM profiles 
        WHERE role = 'admin' 
        LIMIT 1;
    END IF;
    
    -- Récupérer le batch_id courant
    current_batch_id := nullif(current_setting('app.current_batch_id', true), '');
    
    -- Récupérer la raison du changement
    change_reason := coalesce(
        nullif(current_setting('app.change_reason', true), ''),
        'Manual Insert'
    );
    
    -- Permettre l'écriture dans l'historique
    PERFORM set_config('app.writing_to_history', 'true', true);
    
    INSERT INTO brand_mapping_history (
        mapping_id,
        old_data,
        new_data,
        change_type,
        changed_by,
        batch_id,
        reason
    ) VALUES (
        NEW.id,
        NULL,
        to_jsonb(NEW),
        'INSERT',
        current_user_id,
        current_batch_id,
        change_reason
    );
    
    -- Réinitialiser la variable
    PERFORM set_config('app.writing_to_history', 'false', true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer les triggers
DROP TRIGGER IF EXISTS audit_brand_mapping_changes_trigger ON brand_category_mappings;
DROP TRIGGER IF EXISTS audit_brand_mapping_insert_trigger ON brand_category_mappings;

CREATE TRIGGER audit_brand_mapping_changes_trigger
    BEFORE UPDATE OR DELETE ON brand_category_mappings
    FOR EACH ROW EXECUTE FUNCTION audit_brand_mapping_changes();

CREATE TRIGGER audit_brand_mapping_insert_trigger
    AFTER INSERT ON brand_category_mappings
    FOR EACH ROW EXECUTE FUNCTION audit_brand_mapping_insert();

-- Fonctions utilitaires pour définir le contexte des opérations
CREATE OR REPLACE FUNCTION set_current_batch_id(batch_uuid uuid)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_batch_id', batch_uuid::text, true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_change_reason(reason text)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.change_reason', reason, true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clear_audit_context()
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_batch_id', '', true);
    PERFORM set_config('app.change_reason', '', true);
    PERFORM set_config('app.writing_to_history', 'false', true);
END;
$$ LANGUAGE plpgsql;