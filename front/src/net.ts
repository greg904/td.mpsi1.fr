import * as config from './config'

export class InvalidAuthTokenError extends Error {
  constructor () {
    super('Invalid authentication token.')
  }
}

export class ResponseNotOkError extends Error {
  constructor () {
    super('Response is not OK.')
  }
}

export async function logIn (username: string, password: string): Promise<string | null> {
  const res = await fetch(`${config.apiEndpoint}log-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username,
      password
    })
  })

  if (res.status === 401) {
    return null
  }

  if (!res.ok) {
    throw new ResponseNotOkError()
  }

  const json = await res.json()
  if (typeof json !== 'string') {
    throw new Error('Response body is not a string')
  }

  return json
}

export interface Student {
  id: number
  username: string
  fullName: string
  groupA: boolean
}

function isValidStudent (o: any): o is Student {
  return typeof o === 'object' &&
    typeof o.id === 'number' && Number.isSafeInteger(o.id) && o.id >= 0 &&
    typeof o.username === 'string' &&
    typeof o.fullName === 'string' &&
    typeof o.groupA === 'boolean'
}

export async function fetchStudentData (authToken: string): Promise<Student> {
  const res = await fetch(`${config.apiEndpoint}students/me`, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  })

  if (res.status === 401) {
    throw new InvalidAuthTokenError()
  }

  if (!res.ok) {
    throw new ResponseNotOkError()
  }

  const json = await res.json()
  if (!isValidStudent(json)) {
    throw new Error('Response is not valid serialized student data')
  }

  return json
}

export interface Unit {
  // The id of the unit.
  id: number

  // The name of the unit.
  name: string

  // The count of exercises for this unit.
  exerciseCount: number

  // The date of the correction day for group A.
  deadlineA: Date

  // The date of the correction day for group B.
  deadlineB: Date
}

function parseDeadline (str: string): Date {
  const parts = str.split('-', 3).map(p => parseInt(p, 10))
  if (parts.length !== 3 || parts.some(p => !Number.isSafeInteger(p))) {
    throw new Error('Invalid date')
  }
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 20))
}

function parseUnit (o: any): Unit {
  if (typeof o !== 'object' ||
    typeof o.id !== 'number' || !Number.isSafeInteger(o.id) || o.id < 0 ||
    typeof o.name !== 'string' ||
    typeof o.exerciseCount !== 'number' || !Number.isSafeInteger(o.exerciseCount) || o.exerciseCount < 0 ||
    typeof o.deadlineA !== 'string' ||
    typeof o.deadlineB !== 'string') {
    throw new Error('Invalid JSON object')
  }
  return {
    id: o.id,
    name: o.name,
    exerciseCount: o.exerciseCount,
    deadlineA: parseDeadline(o.deadlineA),
    deadlineB: parseDeadline(o.deadlineB)
  }
}

export async function fetchUnits (authToken: string): Promise<Unit[]> {
  const res = await fetch(`${config.apiEndpoint}units`, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  })

  if (res.status === 401) {
    throw new InvalidAuthTokenError()
  }

  if (!res.ok) {
    throw new ResponseNotOkError()
  }

  const json = await res.json()
  if (!Array.isArray(json)) {
    throw new Error('Response body is not an array')
  }

  return json.map(o => parseUnit(o))
}

export interface Exercise {
  // The list of students who reserved this exercise.
  reservedBy: Student[]

  // The list of students who already presented this exercise.
  presentedBy: Student[]

  // Whether or not this exercise should not be done for some reason.
  blocked: boolean

  // Whether or not this exercise was corrected for group A.
  correctedA: boolean

  // Whether or not this exercise was corrected for group B.
  correctedB: boolean

  // A list of digests for the pictures with the correction for that
  // exercise.
  correctionDigests: string[]
}

function isValidExercise (o: any): o is Exercise {
  return typeof o === 'object' &&
    Array.isArray(o.reservedBy) && o.reservedBy.every(isValidStudent) &&
    Array.isArray(o.presentedBy) && o.presentedBy.every(isValidStudent) &&
    typeof o.blocked === 'boolean' &&
    typeof o.correctedA === 'boolean' &&
    typeof o.correctedB === 'boolean' &&
    Array.isArray(o.correctionDigests) && o.correctionDigests.every((d: any) => typeof d === 'string')
}

export async function fetchExercisesInUnit (authToken: string, unitId: number): Promise<Exercise[]> {
  const res = await fetch(`${config.apiEndpoint}units/${unitId}/exercises`, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  })

  if (res.status === 401) {
    throw new InvalidAuthTokenError()
  }

  if (!res.ok) {
    throw new ResponseNotOkError()
  }

  const json = await res.json()
  if (!Array.isArray(json) || !json.every(isValidExercise)) {
    throw new Error('Response body is not an array')
  }

  return json
}

export async function modifyExercise (authToken: string, unitId: number, exerciseId: number, what: string, changes: any): Promise<void> {
  const res = await fetch(`${config.apiEndpoint}units/${unitId}/exercises/${exerciseId}/${what}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changes),
  })

  if (res.status === 401) {
    throw new InvalidAuthTokenError()
  }

  if (!res.ok) {
    throw new ResponseNotOkError()
  }
}

