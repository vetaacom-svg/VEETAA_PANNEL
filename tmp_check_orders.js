const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lubeapgnjpvlxidxfnhb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1YmVhcGduanB2bHhpZHhmbmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNDAzMjAsImV4cCI6MjA4NTgxNjMyMH0.A6kV2LrklpeAmqoPLLI7zjhGuDlyK5WZ2_MIN8sMJ_M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, items, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }
  
  console.log("== RECENT ORDERS ==");
  for (const o of orders) {
    console.log(`\nOrder ID: ${o.id} at ${o.created_at}`);
    console.log("Raw items string length: ", o.items ? (typeof o.items === 'string' ? o.items.length : JSON.stringify(o.items).length) : "NULL/EMPTY");
    let parsedItems = undefined;
    if (typeof o.items === 'string') {
        try { parsedItems = JSON.parse(o.items); } catch(e) {}
    } else {
        parsedItems = o.items;
    }
    console.log("Parsed items array length:", Array.isArray(parsedItems) ? parsedItems.length : "NOT AN ARRAY");
    if (Array.isArray(parsedItems) && parsedItems.length > 0) {
       console.log("First item struct keys:", Object.keys(parsedItems[0]));
       console.log("First item sample:", JSON.stringify(parsedItems[0], null, 2));
    }
    
    // Check order_items table
    const { data: oItems } = await supabase.from('order_items').select('*').eq('order_id', o.id);
    console.log("order_items table count for this order:", oItems ? oItems.length : "Error");
    if (oItems && oItems.length > 0) {
      console.log("First order_item sample:", JSON.stringify(oItems[0], null, 2));
    }
  }
}

checkRecentOrders();
