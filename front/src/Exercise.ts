import Student from "./Student"

export default interface Exercise {
    reservedBy: Student[]
    presentedBy: Student[]
    blocked: boolean
    correctedA: boolean
    correctedB: boolean

    // A list of digests for the pictures with the correction for that
    // exercise.
    correctionDigests: string[]
}
