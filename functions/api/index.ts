import { handleOptions } from './community/_helpers'
import { apiIndexResponse } from '../lib/api-index'

export const onRequestOptions: PagesFunction = async () => handleOptions()

export const onRequestGet: PagesFunction = async () => apiIndexResponse()
