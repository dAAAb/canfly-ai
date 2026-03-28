import { useContext } from 'react'
import { AuthContext, type WorldIdLevel } from '../providers/PrivyAuthProvider'

export type { WorldIdLevel }

export function useAuth() {
  return useContext(AuthContext)
}
