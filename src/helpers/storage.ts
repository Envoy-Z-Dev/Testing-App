import AsyncStorage from '@react-native-async-storage/async-storage'
import { log } from 'expo/build/devtools/logger'


const partKeyPrefix = '@___PART___'
const partKeyPrefixRxp = /^@___PART___/
const keySplit = ','
const limit = 500000

const buildData = (key: string, value: any, datas: Array<[string, string]>) => {
  const valueStr = JSON.stringify(value)
  if (valueStr.length <= limit) {
    datas.push([key, valueStr])
    return
  }

  const partKeys = []
  for (let i = 0, len = Math.floor(valueStr.length / limit); i <= len; i++) {
    const partKey = `${partKeyPrefix}${key}${i}`
    partKeys.push(partKey)
    datas.push([partKey, valueStr.substring(i * limit, (i + 1) * limit)])
  }
  datas.push([key, `${partKeyPrefix}${partKeys.join(keySplit)}`])
}

const handleGetData = async<T>(partKeys: string): Promise<T> => {
  const keys = partKeys.replace(partKeyPrefixRxp, '').split(keySplit)

  return AsyncStorage.multiGet(keys).then(datas => {
    return JSON.parse(datas.map(data => data[1]).join(''))
  })
}

export const saveData = async(key: string, value: any) => {
  const datas: Array<[string, string]> = []
  buildData(key, value, datas)

  try {
    await AsyncStorage.multiSet(datas)
  } catch (e: any) {
    // saving error
    log('storage error[saveData]:', key, e.message)
    throw e
  }
}

export const getData = async<T = unknown>(key: string): Promise<T | null> => {
  let value: string | null
  try {
    value = await AsyncStorage.getItem(key)
  } catch (e: any) {
    // error reading value
    log('storage error[getData]:', key, e.message)
    throw e
  }
  if (value && partKeyPrefixRxp.test(value)) {
    return handleGetData<T>(value)
  } else if (value == null) return value
  return JSON.parse(value)
}

export const removeData = async(key: string) => {
  let value: string | null
  try {
    value = await AsyncStorage.getItem(key)
  } catch (e: any) {
    // error reading value
    log('storage error[removeData]:', key, e.message)
    throw e
  }
  if (value && partKeyPrefixRxp.test(value)) {
    const partKeys = value.replace(partKeyPrefixRxp, '').split(keySplit)
    partKeys.push(key)
    try {
      await AsyncStorage.multiRemove(partKeys)
    } catch (e: any) {
      // remove error
      log('storage error[removeData]:', key, e.message)
      throw e
    }
  } else {
    try {
      await AsyncStorage.removeItem(key)
    } catch (e: any) {
      // remove error
      log('storage error[removeData]:', key, e.message)
      throw e
    }
  }
}

export const getAllKeys = async() => {
  let keys
  try {
    keys = await AsyncStorage.getAllKeys()
  } catch (e: any) {
    // read key error
    log('storage error[getAllKeys]:', e.message)
    throw e
  }

  return keys
}


export const getDataMultiple = async<T extends readonly string[]>(keys: T) => {
  type RawData = { [K in keyof T]: [T[K], string | null] }
  let datas: RawData
  try {
    datas = await AsyncStorage.multiGet(keys) as RawData
  } catch (e: any) {
    // read error
    log('storage error[getDataMultiple]:', e.message)
    throw e
  }
  const promises: Array<Promise<ReadonlyArray<[unknown | null]>>> = []
  for (const [, value] of datas) {
    if (value && partKeyPrefixRxp.test(value)) {
      promises.push(handleGetData(value))
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      promises.push(Promise.resolve(value ? JSON.parse(value) : value))
    }
  }
  return Promise.all(promises).then(values => {
    return datas.map(([key], index) => ([key, values[index]])) as { [K in keyof T]: [T[K], unknown] }
  })
}

export const saveDataMultiple = async(datas: Array<[string, any]>) => {
  const allData: Array<[string, string]> = []
  for (const [key, value] of datas) {
    buildData(key, value, allData)
  }
  try {
    await AsyncStorage.multiSet(allData)
  } catch (e: any) {
    // save error
    log('storage error[saveDataMultiple]:', e.message)
    throw e
  }
}


export const removeDataMultiple = async(keys: string[]) => {
  if (!keys.length) return
  const datas = await AsyncStorage.multiGet(keys)
  const allKeys = []
  for (const [key, value] of datas) {
    allKeys.push(key)
    if (value && partKeyPrefixRxp.test(value)) {
      allKeys.push(...value.replace(partKeyPrefixRxp, '').split(keySplit))
    }
  }
  try {
    await AsyncStorage.multiRemove(allKeys)
  } catch (e: any) {
    // remove error
    log('storage error[removeDataMultiple]:', e.message)
    throw e
  }
}

export const clearAll = async() => {
  try {
    await AsyncStorage.clear()
  } catch (e: any) {
    // clear error
    log('storage error[clearAll]:', e.message)
    throw e
  }
}

export { useAsyncStorage } from '@react-native-async-storage/async-storage'
