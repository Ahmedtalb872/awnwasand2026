import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const adminPass = process.env.VITE_ADMIN_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing supabase env variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDB() {
  console.log("Fetching users with get_admin_users...");
  const { data: users, error: getError } = await supabase.rpc('get_admin_users', { admin_pass: adminPass });
  
  if (getError) {
    console.error("Error fetching users via RPC:", getError);
    console.log("Trying fallback select...");
    const { data: fallbackUsers, error: fallbackError } = await supabase.from('users').select('*');
    if (fallbackError) {
      console.error("Fallback select also failed:", fallbackError);
      return;
    }
    console.log(`Found ${fallbackUsers?.length} users via select.`);
    return;
  }
  
  if (!users || users.length === 0) {
    console.log("No users found.");
    return;
  }
  
  console.log(`Found ${users.length} users.`);
  
  const targetUser = users[0];
  console.log(`Targeting user: ${targetUser.email} (ID: ${targetUser.id}) (Current Status: ${targetUser.approval_status})`);
  
  const newStatus = targetUser.approval_status === 'Approved' ? 'Pending Approval' : 'Approved';
  console.log(`Trying to update status to: ${newStatus}`);
  
  const { data: updateData, error: updateError } = await supabase.rpc('admin_update_user_status', {
    target_user_id: targetUser.id,
    new_status: newStatus,
    admin_secret: adminPass
  });
  
  if (updateError) {
    console.error("Failed to update user via RPC:", updateError);
  } else {
    console.log("Update RPC succeeded! Let's fetch the user again to verify.");
  }
  
  const { data: verifyData, error: verifyError } = await supabase.from('users').select('approval_status').eq('id', targetUser.id).single();
  
  if (verifyError) {
    console.error("Verify fetch failed:", verifyError);
  } else {
    console.log(`Status after update: ${verifyData?.approval_status}`);
    if (verifyData?.approval_status === newStatus) {
      console.log("SUCCESS: The update persisted in the database!");
    } else {
      console.log("FAILED: The update DID NOT persist! Database is refusing the save silently.");
    }
  }
}

testDB();
