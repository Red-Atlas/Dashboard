import { getOperatingSystemData, getCountryData, getActiveUsers, GA_PROPERTY_ID } from '@/lib/google-analytics';

export async function GET() {
  try {
    console.log('=== TESTING GOOGLE ANALYTICS ===');
    console.log('GA_PROPERTY_ID:', GA_PROPERTY_ID ? 'CONFIGURED' : 'NOT CONFIGURED');
    console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'CONFIGURED' : 'NOT CONFIGURED');
    
    // Test 1: Active Users
    console.log('\n1. Testing Active Users...');
    const activeUsers = await getActiveUsers();
    console.log('Active Users Result:', activeUsers);
    
    // Test 2: Operating Systems
    console.log('\n2. Testing Operating Systems...');
    const osData = await getOperatingSystemData();
    console.log('OS Data Result:', osData);
    
    // Test 3: Countries
    console.log('\n3. Testing Countries...');
    const countryData = await getCountryData();
    console.log('Country Data Result:', countryData);
    
    return Response.json({
      status: 'Google Analytics Test',
      ga_property_id_configured: !!GA_PROPERTY_ID,
      credentials_configured: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      results: {
        active_users: activeUsers,
        operating_systems: osData,
        countries: countryData
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('=== GOOGLE ANALYTICS TEST ERROR ===');
    console.error(error);
    
    return Response.json({
      status: 'Error testing Google Analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
      ga_property_id_configured: !!GA_PROPERTY_ID,
      credentials_configured: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      timestamp: new Date().toISOString(),
    });
  }
} 