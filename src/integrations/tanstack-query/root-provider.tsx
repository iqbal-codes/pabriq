import { getQueryClient } from '../../lib/query-client'

export function getContext() {
  return {
    queryClient: getQueryClient(),
  }
}
export default function TanstackQueryProvider() {}
