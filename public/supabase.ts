import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://abwihcvfcdrutnjdghbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFid2loY3ZmY2RydXRuamRnaGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTMzMDYsImV4cCI6MjA3MzAyOTMwNn0.D40AvvDjGWObGUFiNTN0k6ReMoXb1BHG5qpPtXoF5w4';
export const supabase = createClient(supabaseUrl, supabaseKey);

export const TBA_API_KEY = 'sBluV8DKQA0hTvJ2ABC9U3VDZunUGUSehxuDPvtNC8SQ3Q5XHvQVt0nm3X7cvP7j';