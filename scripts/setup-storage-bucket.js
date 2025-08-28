import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  try {
    console.log('🔍 Checking for existing buckets...');
    
    // List existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    console.log('Existing buckets:', buckets?.map(b => b.name) || []);
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'artist-images');
    
    if (bucketExists) {
      console.log('✅ artist-images bucket already exists');
      return;
    }
    
    console.log('📦 Creating artist-images bucket...');
    
    const { data, error } = await supabase.storage.createBucket('artist-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    });
    
    if (error) {
      console.error('❌ Error creating bucket:', error);
      
      // If bucket exists but not in list (edge case), try to make it public
      if (error.message?.includes('already exists')) {
        console.log('🔄 Bucket might exist, trying to update settings...');
        const { error: updateError } = await supabase.storage.updateBucket('artist-images', {
          public: true,
          fileSizeLimit: 5242880,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        });
        
        if (!updateError) {
          console.log('✅ Updated bucket settings successfully');
        } else {
          console.error('Failed to update bucket:', updateError);
        }
      }
    } else {
      console.log('✅ artist-images bucket created successfully!');
      console.log('Bucket details:', data);
    }
    
    // Test the bucket by uploading a small test file
    console.log('\n🧪 Testing bucket with a test file...');
    const testContent = Buffer.from('test');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('artist-images')
      .upload('test.txt', testContent, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
    } else {
      console.log('✅ Test upload successful');
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('artist-images')
        .remove(['test.txt']);
      
      if (!deleteError) {
        console.log('🧹 Cleaned up test file');
      }
    }
    
    console.log('\n✨ Storage setup complete! Artists images will now be saved to Supabase.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setupStorage();
