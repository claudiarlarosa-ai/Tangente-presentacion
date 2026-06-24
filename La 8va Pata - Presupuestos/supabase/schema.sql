-- schema.sql
-- Base de datos para la aplicación de Presupuestos de La 8va Pata

-- Habilitar la extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Proyectos (Presupuestos)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client TEXT,
    agency TEXT,
    product TEXT,
    reason TEXT,
    duration TEXT,
    format TEXT,
    shoot_days INTEGER DEFAULT 1,
    director TEXT,
    contact_8va_pata TEXT,
    budget_number TEXT,
    exchange_rate NUMERIC DEFAULT 3.6,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'liquidated')),
    financing_fee_rate NUMERIC DEFAULT 0.016, -- 1.6%
    admin_fee_rate NUMERIC DEFAULT 0.04,      -- 4.0%
    markup_realization_rate NUMERIC DEFAULT 0.15, -- 15%
    agency_commission_rate NUMERIC DEFAULT 0.0, -- Variable
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Ítems de Presupuesto (Desglose de Producción y Realización)
CREATE TABLE IF NOT EXISTS budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('production', 'realization')),
    category TEXT NOT NULL,
    item_name TEXT NOT NULL,
    unit_cost NUMERIC DEFAULT 0.0,
    quantity NUMERIC DEFAULT 0.0,
    days NUMERIC DEFAULT 0.0,
    total_usd NUMERIC DEFAULT 0.0,
    total_pen NUMERIC DEFAULT 0.0,
    -- Campos exclusivos para el control de Realización y liquidación
    amount_to_liquidate NUMERIC DEFAULT 0.0,
    invoice_name TEXT,
    invoice_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla Maestra de Plantillas
CREATE TABLE IF NOT EXISTS template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('production', 'realization')),
    category TEXT NOT NULL,
    item_name TEXT NOT NULL,
    default_unit_cost NUMERIC DEFAULT 0.0,
    default_quantity NUMERIC DEFAULT 0.0,
    default_days NUMERIC DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Políticas de Seguridad a nivel de fila (Row Level Security - RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;

-- Como la app es para uso interno reducido (2 personas), permitiremos acceso completo a usuarios autenticados.
-- En caso de no tener autenticación configurada estrictamente, permitimos lectura/escritura anónima si se comparte la clave anon de Supabase.
-- Por simplicidad inicial en ambiente cerrado:
CREATE POLICY "Permitir todo a usuarios anonimos en proyectos" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios anonimos en items" ON budget_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios anonimos en plantilla" ON template_items FOR ALL USING (true) WITH CHECK (true);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_budget_items_updated_at BEFORE UPDATE ON budget_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
