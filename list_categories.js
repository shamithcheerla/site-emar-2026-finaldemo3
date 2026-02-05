const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cikaeialdcyxniwxtmzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpa2FlaWFsZGN5eG5pd3h0bXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjk2MjMsImV4cCI6MjA4NTYwNTYyM30.BtcIqTyIR4QZLNG6fYq-bQ3pY3xmjITzDTN9Z4SiOvQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listCategories() {
    const { data, error } = await supabase
        .from('users')
        .select('category');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const categories = [...new Set(data.map(u => u.category))];
    console.log('Categories found in DB:', categories);
}

listCategories();
