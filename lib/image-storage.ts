import { supabase } from './supabase';

/**
 * Downloads an image from a URL and uploads it to Supabase Storage
 * @param imageUrl - The URL of the image to download
 * @param artistId - The artist ID for naming the file
 * @param artistName - The artist name for the file path
 * @returns The public URL of the uploaded image or null if failed
 */
export async function saveImageToSupabase(
  imageUrl: string | null | undefined,
  artistId: number,
  artistName: string
): Promise<string | null> {
  if (!imageUrl) return null;

  try {
    // Clean artist name for file path (remove special chars)
    const cleanName = artistName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50); // Limit length

    // Create unique filename with timestamp to avoid caching issues
    const timestamp = Date.now();
    const fileName = `${cleanName}-${artistId}-${timestamp}.jpg`;
    const filePath = `artists/${artistId}/${fileName}`;

    console.log(`Downloading image for ${artistName} from: ${imageUrl}`);

    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to download image: ${response.statusText}`);
      return null;
    }

    // Get image data as blob
    const blob = await response.blob();
    
    // Convert blob to array buffer for Supabase
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    console.log(`Uploading image to Supabase: ${filePath}`);
    const { data, error } = await supabase.storage
      .from('artist-images')
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true, // Overwrite if exists
        cacheControl: '31536000', // Cache for 1 year
      });

    if (error) {
      // If bucket doesn't exist, return null gracefully
      if (error.message?.includes('Bucket not found')) {
        console.log('⚠️ Storage bucket not yet created - using Spotify URL as fallback');
      } else {
        console.error('Error uploading to Supabase:', error);
      }
      return null;
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('artist-images')
      .getPublicUrl(filePath);

    console.log(`✓ Image saved to Supabase: ${publicUrl}`);
    return publicUrl;

  } catch (error) {
    console.error('Error saving image to Supabase:', error);
    return null;
  }
}

/**
 * Creates the artist-images bucket if it doesn't exist
 * This should be called once during setup
 */
export async function createArtistImagesBucket() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'artist-images');
    
    if (!bucketExists) {
      console.log('Creating artist-images bucket...');
      
      const { data, error } = await supabase.storage.createBucket('artist-images', {
        public: true, // Make images publicly accessible
        fileSizeLimit: 5242880, // 5MB max file size
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
      });

      if (error) {
        console.error('Error creating bucket:', error);
        return false;
      }

      console.log('✓ Artist images bucket created successfully');
    } else {
      console.log('Artist images bucket already exists');
    }

    return true;
  } catch (error) {
    console.error('Error setting up storage bucket:', error);
    return false;
  }
}

/**
 * Deletes an artist's images from Supabase Storage
 * @param artistId - The artist ID
 */
export async function deleteArtistImages(artistId: number) {
  try {
    const { data: files, error: listError } = await supabase.storage
      .from('artist-images')
      .list(`artists/${artistId}`);

    if (listError) {
      console.error('Error listing artist images:', listError);
      return;
    }

    if (files && files.length > 0) {
      const filePaths = files.map(file => `artists/${artistId}/${file.name}`);
      
      const { error: deleteError } = await supabase.storage
        .from('artist-images')
        .remove(filePaths);

      if (deleteError) {
        console.error('Error deleting artist images:', deleteError);
      } else {
        console.log(`Deleted ${filePaths.length} images for artist ${artistId}`);
      }
    }
  } catch (error) {
    console.error('Error deleting artist images:', error);
  }
}
