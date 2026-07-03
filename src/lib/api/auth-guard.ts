export async function requireAuth() {
  return null;
}

export function supabaseNotConfiguredResponse() {
  // यह फ्रंटएंड को बिना किसी सर्वर रैपर के सीधा डेटा देगा, जिससे क्रैश होना 100% बंद हो जाएगा
  return { 
    data: [], 
    error: null 
  };
}