'use strict'

const { checkForConflicts, resolveConflicts } = require('./utils/conflicts')

module.exports = class Net {
    constructor({ network, timeLimit }) {
        this.network = network
        this.timeLimit = timeLimit ? timeLimit : 1

        this.netState = {} // object(place id <-> number of markers)
        this.consumerIds = [] // Ids of trans that consumed markers on the step
        this.areMarkersConsumed = false

        this.getNetState()
    }

    getNetState() {
        for (const transition of this.network)
            for (const elem of transition.elems)
                this.netState[elem.place.id] = elem.place.markers
        // console.dir(this.netState, { depth: null })
    }

    launch() {
        while(this.timeLimit > 0)
            this.makeMove()

        return this.netState
    }
    
    next() {
        if (this.timeLimit > 0)
            this.makeMove()

        return this.netState
    }

    // @return ids of transitions that can be executed now
    getOnlyValidMoves() {
        const validTransIds = []
        for (const transition of this.network) {
            const inArcsForTrans = transition.elems.filter(
                elem => elem.arc.direction === 'in')
            const validMovesForTrans = inArcsForTrans.filter(
                elem => elem.place.markers >= elem.arc.weight)
            if (validMovesForTrans.length === inArcsForTrans.length)
                validTransIds.push(transition.trans.id)
        }
        
        return validTransIds
    }

    consume() {
        let validTransIds = this.getOnlyValidMoves()

        // Resolve conflicts if there are any
        const conflicts = checkForConflicts(validTransIds, this.network)
        let noConflicts = true
        for (const tr in conflicts)
            if (conflicts[tr].length) noConflicts = false

        console.log(`No conflicts: ${noConflicts}`)
        console.log(`before: ${validTransIds}`)
        console.log(conflicts)
        if (!noConflicts)
            validTransIds = resolveConflicts(conflicts, validTransIds, this.network)
        console.log(`after: ${validTransIds}`)

        // Consume markers
        for (const item of this.network) {
            if (!validTransIds.includes(item.trans.id)) continue

            let isConsumed = false
            for (const elem of item.elems) {
                if (elem.arc.direction === 'in' &&
                        elem.place.markers >= elem.arc.weight) {
                    elem.place.markers -= elem.arc.weight
                    console.log(`Id: ${elem.place.id} Markers: ${elem.place.markers}`)
                    this.netState[elem.place.id] = elem.place.markers
                    isConsumed = true
                }
            }

            if (isConsumed) this.consumerIds.push(item.trans.id)
        }
    }

    produce() {
        for (const item of this.network) {
            if (!this.consumerIds.includes(item.trans.id)) continue

            this.consumerIds = this.consumerIds.filter(x => x !== item.trans.id)

            for (const elem of item.elems) {
                if (elem.arc.direction === 'out') {
                    elem.place.markers += elem.arc.weight
                    this.netState[elem.place.id] = elem.place.markers
                }
            }
        }
    }

    makeMove() {
        this.areMarkersConsumed ?
            ( this.produce(), this.timeLimit-- ) :
            this.consume()

        this.areMarkersConsumed = !this.areMarkersConsumed
    }
}
