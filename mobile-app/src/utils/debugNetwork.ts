export const debugNetworkRequest = async (url: string) => {
  console.log('=== Network Debug ===');
  console.log('Attempting to connect to:', url);
  console.log('EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    return response;
  } catch (error: any) {
    console.error('Network error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw error;
  }
};