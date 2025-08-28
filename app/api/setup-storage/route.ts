import { NextResponse } from 'next/server';
import { createArtistImagesBucket } from '@/lib/image-storage';

export async function POST() {
  try {
    const success = await createArtistImagesBucket();
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Storage bucket ready' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to setup storage bucket' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Storage setup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Storage setup failed' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to setup storage' 
  });
}
