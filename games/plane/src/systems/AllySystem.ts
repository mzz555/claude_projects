const INITIAL_CHARGES = 3;
const MAX_CHARGES = 5;

export class AllySystem {
    private charges = INITIAL_CHARGES;

    getCharges(): number {
        return this.charges;
    }

    addCharge(): void {
        this.charges = Math.min(MAX_CHARGES, this.charges + 1);
    }

    tryDeploy(): boolean {
        if (this.charges <= 0) return false;
        this.charges -= 1;
        return true;
    }
}
