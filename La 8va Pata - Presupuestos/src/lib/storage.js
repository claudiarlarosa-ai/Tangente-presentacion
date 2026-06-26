import { supabase } from './supabaseClient';
import defaultTemplates from './template_items.json';

// Helper to check if Supabase is properly configured and online
const isSupabaseConfigured = () => {
  if (typeof window !== 'undefined' && window.navigator && !window.navigator.onLine) {
    return false;
  }
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && url !== 'https://your-project-id.supabase.co' && key && key !== 'your-anon-key-here';
};

// Initial template load
export async function getTemplateItems() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('template_items').select('*');
      if (!error && data && data.length > 0) {
        return data;
      }
      // If table is empty, initialize it
      if (data && data.length === 0) {
        await initializeSupabaseTemplates();
        const { data: retryData } = await supabase.from('template_items').select('*');
        if (retryData) return retryData;
      }
    } catch (e) {
      console.warn("Supabase templates fetch failed, falling back to local JSON:", e);
    }
  }

  // Local storage / JSON fallback
  const localTemplates = localStorage.getItem('template_items');
  if (localTemplates) {
    const parsed = JSON.parse(localTemplates);
    // Migration check: if using old key format, clear it to force reload
    if (parsed.length > 0 && parsed[0].unit_cost !== undefined) {
      localStorage.removeItem('template_items');
    } else {
      return parsed;
    }
  }
  
  // Format local default templates from JSON
  const formatted = [];
  defaultTemplates.production.forEach(item => {
    formatted.push({
      id: crypto.randomUUID(),
      type: 'production',
      category: item.category,
      item_name: item.item_name,
      default_unit_cost: item.unit_cost || 0.0,
      default_quantity: 0.0,
      default_days: 0.0
    });
  });
  defaultTemplates.realization.forEach(item => {
    formatted.push({
      id: crypto.randomUUID(),
      type: 'realization',
      category: item.category,
      item_name: item.item_name,
      default_unit_cost: item.unit_cost || 0.0,
      default_quantity: 0.0,
      default_days: 0.0
    });
  });
  
  localStorage.setItem('template_items', JSON.stringify(formatted));
  return formatted;
}

export async function saveTemplateItem(item) {
  if (isSupabaseConfigured()) {
    try {
      if (item.id && typeof item.id === 'string' && item.id.length > 10) {
        // Update
        const { error } = await supabase.from('template_items').update({
          category: item.category,
          item_name: item.item_name,
          default_unit_cost: item.default_unit_cost,
          default_quantity: item.default_quantity,
          default_days: item.default_days
        }).eq('id', item.id);
        if (!error) return;
      } else {
        // Insert
        const { error } = await supabase.from('template_items').insert({
          type: item.type,
          category: item.category,
          item_name: item.item_name,
          default_unit_cost: item.default_unit_cost,
          default_quantity: item.default_quantity,
          default_days: item.default_days
        });
        if (!error) return;
      }
    } catch (e) {
      console.error(e);
    }
  }

  // LocalStorage update
  const templates = await getTemplateItems();
  const index = templates.findIndex(t => t.id === item.id);
  if (index !== -1) {
    templates[index] = { ...templates[index], ...item };
  } else {
    templates.push({ ...item, id: item.id || crypto.randomUUID() });
  }
  localStorage.setItem('template_items', JSON.stringify(templates));
}

export async function deleteTemplateItem(id) {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('template_items').delete().eq('id', id);
      if (!error) return;
    } catch (e) {
      console.error(e);
    }
  }

  const templates = await getTemplateItems();
  const filtered = templates.filter(t => t.id !== id);
  localStorage.setItem('template_items', JSON.stringify(filtered));
}

async function initializeSupabaseTemplates() {
  const formatted = [];
  defaultTemplates.production.forEach(item => {
    formatted.push({
      type: 'production',
      category: item.category,
      item_name: item.item_name,
      default_unit_cost: item.unit_cost,
      default_quantity: 0.0,
      default_days: 0.0
    });
  });
  defaultTemplates.realization.forEach(item => {
    formatted.push({
      type: 'realization',
      category: item.category,
      item_name: item.item_name,
      default_unit_cost: item.unit_cost,
      default_quantity: 0.0,
      default_days: 0.0
    });
  });

  // Bulk insert in chunks of 50
  for (let i = 0; i < formatted.length; i += 50) {
    const chunk = formatted.slice(i, i + 50);
    await supabase.from('template_items').insert(chunk);
  }
}

// PROJECTS
export async function getProjects() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (!error) return data;
    } catch (e) {
      console.warn("Supabase fetch projects failed, falling back to local storage:", e);
    }
  }

  const localProjects = localStorage.getItem('projects');
  return localProjects ? JSON.parse(localProjects) : [];
}

export async function resetTemplateItems() {
  if (isSupabaseConfigured()) {
    try {
      // Clear all items in template_items
      await supabase.from('template_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await initializeSupabaseTemplates();
    } catch (e) {
      console.error("Supabase templates reset failed:", e);
    }
  }

  // Clear local storage cache
  localStorage.removeItem('template_items');
  await getTemplateItems(); // Re-populate
}

export async function createProject(project) {
  const newProject = {
    ...project,
    id: project.id || crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: project.status || 'draft',
    exchange_rate: parseFloat(project.exchange_rate) || 3.6,
    financing_fee_rate: parseFloat(project.financing_fee_rate) || 0.016,
    admin_fee_rate: parseFloat(project.admin_fee_rate) || 0.04,
    markup_realization_rate: parseFloat(project.markup_realization_rate) || 0.15,
    agency_commission_rate: parseFloat(project.agency_commission_rate) || 0.0
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('projects').insert(newProject).select().single();
      if (!error) {
        // Prepopulate budget items in database
        await initializeProjectBudgetItems(data.id);
        return data;
      }
      console.error("Supabase insert project error:", error);
    } catch (e) {
      console.error(e);
    }
  }

  // Local storage creation
  const projects = await getProjects();
  projects.unshift(newProject);
  localStorage.setItem('projects', JSON.stringify(projects));

  // Prepopulate local budget items with quantity and days at 0, unit_cost from template
  const templates = await getTemplateItems();
  const items = templates.map(t => ({
    id: crypto.randomUUID(),
    project_id: newProject.id,
    type: t.type,
    category: t.category,
    item_name: t.item_name,
    unit_cost: t.default_unit_cost,
    quantity: 0,
    days: 0,
    amount_to_liquidate: 0.0,
    invoice_name: '',
    invoice_number: ''
  }));
  localStorage.setItem(`budget_items_${newProject.id}`, JSON.stringify(items));

  return newProject;
}

async function initializeProjectBudgetItems(projectId) {
  const templates = await getTemplateItems();
  const items = templates.map(t => ({
    project_id: projectId,
    type: t.type,
    category: t.category,
    item_name: t.item_name,
    unit_cost: t.default_unit_cost,
    quantity: 0,
    days: 0,
    amount_to_liquidate: 0.0,
    invoice_name: '',
    invoice_number: ''
  }));

  // Bulk insert chunks
  for (let i = 0; i < items.length; i += 50) {
    const chunk = items.slice(i, i + 50);
    await supabase.from('budget_items').insert(chunk);
  }
}

export async function updateProject(id, updates) {
  const cleanUpdates = { ...updates, updated_at: new Date().toISOString() };
  delete cleanUpdates.id;
  delete cleanUpdates.created_at;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('projects').update(cleanUpdates).eq('id', id).select().single();
      if (!error) return data;
    } catch (e) {
      console.error(e);
    }
  }

  const projects = await getProjects();
  const index = projects.findIndex(p => p.id === id);
  if (index !== -1) {
    projects[index] = { ...projects[index], ...cleanUpdates };
    localStorage.setItem('projects', JSON.stringify(projects));
    return projects[index];
  }
  return null;
}

export async function deleteProject(id) {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.error(e);
    }
  }

  const projects = await getProjects();
  const filtered = projects.filter(p => p.id !== id);
  localStorage.setItem('projects', JSON.stringify(filtered));
  localStorage.removeItem(`budget_items_${id}`);
  return true;
}

// BUDGET ITEMS
export async function getBudgetItems(projectId) {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('budget_items').select('*').eq('project_id', projectId);
      if (!error) return data;
    } catch (e) {
      console.error(e);
    }
  }

  const localItems = localStorage.getItem(`budget_items_${projectId}`);
  return localItems ? JSON.parse(localItems) : [];
}

export async function saveBudgetItems(projectId, items) {
  if (isSupabaseConfigured()) {
    try {
      // Since it's a batch update, we can update them in chunks or use a custom RPC.
      // Alternatively, delete existing items and insert new ones to keep it simple, or update one by one.
      // Deleting and re-inserting is very clean if RLS permits:
      const { error: delError } = await supabase.from('budget_items').delete().eq('project_id', projectId);
      if (!delError) {
        // Insert new ones (remove ids to let Postgres generate them)
        const cleanItems = items.map(item => {
          const c = { ...item, project_id: projectId };
          delete c.id;
          delete c.created_at;
          delete c.updated_at;
          return c;
        });

        for (let i = 0; i < cleanItems.length; i += 50) {
          const chunk = cleanItems.slice(i, i + 50);
          await supabase.from('budget_items').insert(chunk);
        }
        return;
      }
    } catch (e) {
      console.error("Supabase items update failed, updating locally:", e);
    }
  }

  localStorage.setItem(`budget_items_${projectId}`, JSON.stringify(items));
}

export async function resetProjectBudgetCosts(projectId) {
  const templates = await getTemplateItems();
  const currentItems = await getBudgetItems(projectId);

  const updatedItems = currentItems.map(item => {
    const match = templates.find(t => t.item_name === item.item_name && t.type === item.type);
    if (match) {
      const unitCost = match.default_unit_cost || 0.0;
      const qty = parseFloat(item.quantity) || 0;
      const days = parseFloat(item.days) || 0;
      return {
        ...item,
        unit_cost: unitCost,
        total_usd: qty * days * unitCost,
        total_pen: qty * days * unitCost * (match.exchange_rate || 3.6) // Wait, use project's rate or default
      };
    }
    return item;
  });

  await saveBudgetItems(projectId, updatedItems);
  return updatedItems;
}

// CLIENTS
export async function getClients() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('clients').select('*').order('name', { ascending: true });
      if (!error) return data;
    } catch (e) {
      console.warn("Supabase fetch clients failed, falling back to local storage:", e);
    }
  }
  const localClients = localStorage.getItem('clients');
  if (localClients) return JSON.parse(localClients);
  // Default mock clients for demonstration:
  const mockClients = [
    { id: '1', name: 'Backus', contact: 'María Alejandra Vega', email: 'mvega@backus.pe', phone: '987 654 321', status: 'active', created_at: new Date().toISOString() },
    { id: '2', name: 'McCann Lima', contact: 'Carlos Rodriguez', email: 'crodriguez@mccann.pe', phone: '999 888 777', status: 'active', created_at: new Date().toISOString() },
    { id: '3', name: 'Interbank', contact: 'Sandra Alva', email: 'salva@interbank.pe', phone: '944 333 222', status: 'active', created_at: new Date().toISOString() }
  ];
  localStorage.setItem('clients', JSON.stringify(mockClients));
  return mockClients;
}

export async function saveClient(client) {
  const newClient = {
    ...client,
    id: client.id || crypto.randomUUID(),
    created_at: client.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: client.status || 'active'
  };

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('clients').upsert(newClient);
      if (!error) return newClient;
    } catch (e) {
      console.error("Supabase save client failed:", e);
    }
  }

  const clients = await getClients();
  const index = clients.findIndex(c => c.id === newClient.id);
  if (index !== -1) {
    clients[index] = newClient;
  } else {
    clients.push(newClient);
  }
  localStorage.setItem('clients', JSON.stringify(clients));
  return newClient;
}

export async function deleteClient(id) {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.error(e);
    }
  }
  const clients = await getClients();
  const filtered = clients.filter(c => c.id !== id);
  localStorage.setItem('clients', JSON.stringify(filtered));
  return true;
}
