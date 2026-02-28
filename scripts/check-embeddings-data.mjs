import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data: users } = await supabase.from('users').select('company_id').limit(1)
if (!users?.length) { console.log('No users found'); process.exit(1) }
const companyId = users[0].company_id
console.log('Company ID:', companyId)

const [products, orders, customers, machines, embeddings] = await Promise.all([
  supabase.from('products').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
  supabase.from('orders').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
  supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
  supabase.from('machines').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
  supabase.from('knowledge_embeddings').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
])

console.log('Products:', products.count)
console.log('Orders:', orders.count)
console.log('Customers:', customers.count)
console.log('Machines:', machines.count)
console.log('Existing embeddings:', embeddings.count)
