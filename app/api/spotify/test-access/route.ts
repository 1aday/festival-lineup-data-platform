import { NextResponse } from 'next/server';
import { spotifyApi } from '@/lib/spotify-api';

export async function GET() {
  try {
    console.log('Starting Spotify API access test...');
    await spotifyApi.testApiAccess();

    return NextResponse.json({
      success: true,
      message: 'API access test completed. Check the console logs for detailed results.'
    });
  } catch (error: any) {
    console.error('Test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: 'Check the console for detailed test results.'
      },
      { status: 500 }
    );
  }
}
