const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://lubeapgnjpvlxidxfnhb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1YmVhcGduanB2bHhpZHhmbmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNDAzMjAsImV4cCI6MjA4NTgxNjMyMH0.A6kV2LrklpeAmqoPLLI7zjhGuDlyK5WZ2_MIN8sMJ_M';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function normalize(val) {
  if (!val || typeof val !== 'string') return null;
  if (val.startsWith('http') || val.startsWith('data:')) return val;

  const variants = [val];
  if (!val.startsWith('stores/')) variants.push(`stores/${val}`);
  if (!val.startsWith('public/')) variants.push(`public/${val}`);
  if (val.startsWith('/')) variants.push(val.replace(/^\/+/, ''));
  const parts = val.split('/');
  if (parts.length > 1) variants.push(parts[parts.length - 1]);

  for (const v of variants) {
    try {
      const res = supabase.storage.from('stores').getPublicUrl(v);
      const url = res && res.data && res.data.publicUrl;
      if (url) return url;
    } catch (e) {
      // ignore and try next variant
    }
  }
  return null;
}

async function main() {
  console.log('Fetching stores missing image_url...');
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id,name,image_url')
    .or('image_url.is.null,image_url.eq.\"\"')
    .limit(1000);

  if (error) {
    console.error('Error fetching stores:', error.message || error);
    process.exit(1);
  }

  if (!stores || stores.length === 0) {
    console.log('No stores to update.');
    return;
  }

  let updated = 0;
  let failed = 0;

  // Pre-list files in storage to help resolve legacy filenames
  let storageFiles = [];
  try {
    const listRes = await supabase.storage.from('stores').list('', { limit: 2000 });
    storageFiles = (listRes && listRes.data) || [];
  } catch (e) {
    console.warn('Could not list storage files:', e?.message || e);
  }

  for (const s of stores) {
    const id = s.id;
    const name = (s.name || '').toLowerCase();
    let resolved = null;

    // Try direct image_url first (if present but empty string handled earlier)
    if (s.image_url) resolved = await normalize(s.image_url);

    // If not resolved, try to find a matching file in storage by name or id
    if (!resolved && storageFiles.length > 0) {
      const match = storageFiles.find(f => f.name.includes(id) || f.name.toLowerCase().includes(name));
      if (match) {
        try {
          const url = supabase.storage.from('stores').getPublicUrl(match.name).data.publicUrl;
          if (url) resolved = url;
        } catch (e) {
          // ignore
        }
      }
    }

    // Fallback: try normalize using name-based common filenames
    if (!resolved && name) {
      const candidates = [`${name}.png`, `${name}.jpg`, `${name.replace(/\s+/g,'_')}.png`];
      for (const c of candidates) {
        const r = await normalize(c);
        if (r) { resolved = r; break; }
      }
    }
    if (resolved) {
      try {
        const { error: upErr } = await supabase.from('stores').update({ image_url: resolved }).eq('id', id);
        if (upErr) {
          console.warn(`Failed to update store ${id}:`, upErr.message || upErr);
          failed++;
        } else {
          console.log(`Updated store ${id} → ${resolved}`);
          updated++;
        }
      } catch (e) {
        console.warn(`Exception updating store ${id}:`, e);
        failed++;
      }
    } else {
      console.warn(`Could not resolve image for store ${id} (image: ${imgField})`);
      failed++;
    }
  }

  console.log(`Done. Updated: ${updated}, Failed/unresolved: ${failed}`);
}

main().catch(err => { console.error('Script error:', err); process.exit(1); });
