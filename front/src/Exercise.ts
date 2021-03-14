import Student from "./Student"

export default interface Exercise {
    reservedBy: Student[]
    presentedBy: Student[]
    blocked: boolean
    correctedA: boolean
    correctedB: boolean
}