import { supabase } from './lib/supabase';

/**
 * Test script to verify Supabase Storage bucket exists
 * Run this to debug storage issues
 */
export async function testStorageBucket() {
   console.log('🔍 Testing Supabase Storage...');
   
   try {
      // Test 1: List buckets
      console.log('📋 Listing buckets...');
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
         console.error('❌ Error listing buckets:', bucketsError);
         return;
      }
      
      console.log('✅ Buckets found:', buckets?.map(b => b.name));
      
      // Test 2: Check if 'stores' bucket exists
      const storesBucket = buckets?.find(b => b.name === 'stores');
      if (!storesBucket) {
         console.warn('⚠️ "stores" bucket does NOT exist!');
         console.log('📝 You need to create it in Supabase Dashboard → Storage');
      } else {
         console.log('✅ "stores" bucket exists');
         console.log('  - Public:', storesBucket.public);
         console.log('  - ID:', storesBucket.id);
      }
      
      // Test 3: Try a small test upload
      if (storesBucket) {
         console.log('📤 Testing upload...');
         const testBlob = new Blob(['test'], { type: 'text/plain' });
         const { data: uploadData, error: uploadError } = await supabase.storage
            .from('stores')
            .upload(`test_${Date.now()}.txt`, testBlob);
         
         if (uploadError) {
            console.error('❌ Upload failed:', uploadError);
         } else {
            console.log('✅ Upload succeeded:', uploadData);
            
            // Try to get public URL
            const { data: urlData } = supabase.storage.from('stores').getPublicUrl(`test_${Date.now()}.txt`);
            console.log('✅ Public URL:', urlData?.publicUrl);
         }
      }
      
   } catch (err) {
      console.error('❌ Storage test failed:', err);
   }
}

// Run it
testStorageBucket();
