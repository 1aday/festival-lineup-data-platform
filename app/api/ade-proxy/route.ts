import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const ADE_API_BASE = 'https://www.amsterdam-dance-event.nl/api';

// Headers to mimic browser requests
const getHeaders = () => ({
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.6',
  'content-type': 'application/json',
  'referer': 'https://www.amsterdam-dance-event.nl/en/program/filter/',
  'sec-ch-ua': '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '0';
    const from = searchParams.get('from') || '2025-10-22';
    const to = searchParams.get('to') || '2025-10-26';
    const types = searchParams.get('types') || '8262,8263';
    const section = searchParams.get('section') || 'persons';

    const url = `${ADE_API_BASE}/program/filter/?section=${section}&type=${types}&from=${from}&to=${to}&page=${page}`;

    console.log(`Fetching ADE API: Page ${page}`);

    const response = await axios.get(url, {
      headers: getHeaders(),
      timeout: 10000,
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('ADE API Proxy Error:', error);
    
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch ADE data', 
          message: error.message,
          status: error.response?.status 
        },
        { status: error.response?.status || 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
