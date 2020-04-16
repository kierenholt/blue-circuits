function removeItemFromArray(item, array) {   
    let index = array.indexOf(item);
    if (index > -1) {
        array.splice(index, 1);
    }
}

function objectSome(obj,func) {
    for (var key in obj) {
        if (func(obj[key])) {return true; }
    }
    return false;
} 

function randomOrderForEach(seed, arr, func) {
    for (var i = 0; i < arr.length; i++) {
        //choose next random
        seed = (seed + PHI) % 1;
        var index = Math.floor(seed * arr.length);

        //pseudo random thing using golden ratio
        func(arr[index]);
    }
    return seed;
}

const STUD_GRID_START_X = 125;
const STUD_GRID_START_Y = 125;
const CELL_DEFAULT_EMF = 12;
const CIRCUIT_UPDATES_PER_FRAME = 10; //100 lags. BIGGER means less bounce (good)
const DEFAULT_CAPACITANCE = 0.5; //bigger means takes longer to charge. above 1 is unstable.
                                //should be 100x resistance
const DEFAULT_CONDUCTANCE = 0.001; //0.01 makes voltage drop across wires
const CELL_CURRENT_LIMIT_FOR_FIRE = 100;
const ELECTRON_SPEED = 5;
const PHI = 0.61803398875;
const SPAWN_VERTICAL_SPACING = 50;
const CURRENT_MAGNIFYING_FACTOR = 1; //pointless
const STUD_VOLTAGE_MEAN_SAMPLE_SIZE = 10; //10 is enough

abstract class DraggableComponent extends Phaser.GameObjects.Sprite {
    isHor: boolean;
    studA: Stud;
    studB: Stud;
    notYetInCircuit: boolean;
    capacitanceBoost: number = 0;
    electrons: Electron[] = [];
    prevCurrent = 0;

    constructor(scene:Scene1,x,y,texture) {
        super(scene,x,y,texture); 
        scene.add.existing(this);
        this.notYetInCircuit = true;

        scene.input.setDraggable(this.setInteractive());

        this.on('dragstart',this.dragStart);
        this.on('drag', this.onDrag);
        this.on('dragend',this.dragEnd);
        this.on("destroy", this.onDestroy);
        this.on('pointerdown',this.onClick);
    }

    dragStart(pointer) {
        if (this.notYetInCircuit) {
            this.notYetInCircuit = false;
            this.scene.add.existing(this.clone()); 
        }

        //remove from components that update  
        removeItemFromArray(this,this.scene.components);

        if (this.studA) { this.studA.removeComponent(this); };
        if (this.studB) { this.studB.removeComponent(this); }
    }

    onDrag(pointer, dragX, dragY) {
        let modX = dragX % 125;
        let modY = dragY % 125;
        this.isHor =  ((modX > modY) == (modX + modY < 125));
        if (this.isHor) {
            this.angle = 0;
            this.x = Phaser.Math.Snap.To(dragX, 125, STUD_GRID_START_X - 62.5); 
            this.y = Phaser.Math.Snap.To(dragY, 125, STUD_GRID_START_Y);
        }   
        else {
            this.angle = 90;
            this.x = Phaser.Math.Snap.To(dragX, 125, STUD_GRID_START_X); 
            this.y = Phaser.Math.Snap.To(dragY, 125, STUD_GRID_START_Y - 62.5);
        }   

        this.electrons.forEach(e => { e.visible = false;});
    }

    dragEnd(pointer) {
        let coordsA = this.getStudA();
        this.studA = this.scene.studGrid[coordsA[0]][coordsA[1]];
        let coordsB = this.getStudB();
        this.studB = this.scene.studGrid[coordsB[0]][coordsB[1]];

        //if a component is already in that place then replace it
        var alreadyThere = this.scene.components.filter(c => {
                return c.studA == this.studA && c.studB == this.studB;
            });
        for (var item of alreadyThere) {
            removeItemFromArray(item,this.scene.components);
            item.destroy(); 
        }

        //add electrons if not alrready there
        if (this.electrons.length < 1) {
            this.electrons.push(new Electron(this.scene, this.x, this.y, this, -50));
            this.electrons.push(new Electron(this.scene, this.x, this.y, this, -25));    
            this.electrons.push(new Electron(this.scene, this.x, this.y, this, 25));
            this.electrons.push(new Electron(this.scene, this.x, this.y, this, 50));
        }
        else {
            this.updateElectrons();
            this.electrons.forEach(e => { e.visible = true;});
        }

        //add to update components
        if (this.studA != undefined && this.studB != undefined) {
            this.scene.components.push(this);
            this.studA.addComponent(this);
            this.studB.addComponent(this);
        }
        else { //placed somewhere stupid
            this.destroy();
        }
    }

    onDestroy(item) {
        item.electrons.forEach(e => e.destroy());
    }

    onClick(pointer) {
    }

    getStudA() {
        return [Math.floor((this.x - STUD_GRID_START_X) / 125),
            Math.floor((this.y - STUD_GRID_START_Y) / 125)];
    }

    getStudB() {
        if (this.isHor) {
            return [Math.floor((this.x - STUD_GRID_START_X) / 125) + 1,
                Math.floor((this.y - STUD_GRID_START_Y) / 125)];
        }
        else {
            return [Math.floor((this.x - STUD_GRID_START_X) / 125),
                Math.floor((this.y - STUD_GRID_START_Y) / 125) + 1];
        }
    }

    updateElectrons()  {
        this.electrons.forEach(e => e.updatePosition(this.x,this.y,this.isHor))
    }
 
    abstract clone(); 
    abstract updateStuds();
}

abstract class DraggableComponentWithText extends DraggableComponent {
    text: Phaser.GameObjects.Text;
    constructor(scene,x,y,texture) {
        super(scene,x,y,texture);
        this.text = this.scene.add.text(this.x, this.y, "", {
            fill:"#000",
            fontSize:"12px",
            fontFamily:"Arial Black"
          }).setVisible(false);
    }


    dragStart(pointer) {
        super.dragStart(pointer);
        this.text.setVisible(false);
    }

    dragEnd(pointer) {
        super.dragEnd(pointer);
        this.setTextPosition();
        this.text.setVisible(true);
    }

    updateElectrons() {
        super.updateElectrons();
        this.text.setText(this.getText());
    }

    onDestroy(item) {
        this.text.destroy();
        super.onDestroy(item);
    }

    abstract updateStuds();
    abstract getText();
    abstract setTextPosition();
    abstract clone();
}


class Resistor extends DraggableComponentWithText {
    conductance:number = DEFAULT_CONDUCTANCE;

    constructor(scene,x,y) {
        super(scene,x,y,"resistor");
    }

    clone() {
        return new Resistor(this.scene,this.x,this.y);
    }

    updateStuds() {
        let current = (this.studA.charge + this.prevCurrent - this.studB.charge) * this.conductance;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
    }

    getText() {
        // CURRENT_MAGNIFYING_FACTOR
        return (1/this.conductance).toFixed(0)+"Ω";
    }

    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x-18,this.y-9).setAngle(0);
        }
        else {
            this.text.setPosition(this.x+9,this.y-15).setAngle(90);
        }
    }
}

class Bulb extends DraggableComponent {
    conductance:number = DEFAULT_CONDUCTANCE;

    constructor(scene,x,y) {
        super(scene,x,y,"bulb");
    }

    clone() {
        return new Bulb(this.scene,this.x,this.y);
    }

    updateStuds() {
        let current = (this.studA.charge + this.prevCurrent - this.studB.charge) * this.conductance;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
    }
}


class Wire extends DraggableComponent {
    prevPrevCurrent = -10;
    charge: number = 0;

    constructor(scene,x,y) {
        super(scene,x,y,"wire");
    }

    clone() {
        return new Wire(this.scene,this.x,this.y);
    }

    updateStuds() {
        
        var secondChange = Math.abs(this.prevCurrent - this.prevPrevCurrent);
        if (secondChange < 0.01) {secondChange = 1}
        if (secondChange > 0.01) {secondChange *= 100}

        let current = (this.studA.charge + this.prevCurrent - this.studB.charge) / 2 / secondChange;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.charge += current;

        this.prevPrevCurrent= this.prevCurrent;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
    }
}


class Switch extends DraggableComponent {
    _isOpen = true;

    constructor(scene,x,y) {
        super(scene,x,y,"switch-open");
    }

    onClick(pointer) {
        this._isOpen = !this._isOpen;
        this.setTexture(this._isOpen ? "switch-open" : "switch-closed");
    }

    clone() {
        return new Switch(this.scene,this.x,this.y);
    }

    updateStuds() {
        if (!this._isOpen) {
            let current = (this.studA.charge + this.prevCurrent - this.studB.charge) / 2;
            this.studA.charge -= current;
            this.studB.charge += current;
            this.prevCurrent = current;
            this.electrons.forEach(e => e.updateOffset(current));
        }
    }
}

class Capacitor extends DraggableComponentWithText {
    charge = 0;
    capacitance = DEFAULT_CAPACITANCE;

    constructor(scene,x,y) {
        super(scene,x,y,"capacitor");
    }

    clone() {
        return new Capacitor(this.scene,this.x,this.y);
    }

    updateStuds() {
        let current = (this.studA.charge + this.prevCurrent - this.studB.charge - this.charge) * this.capacitance;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
    }

    getText() {
        return (1000*this.capacitance).toFixed(0) + "mF";
    }
    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x-5,this.y-25).setAngle(0);
        }
        else {
            this.text.setPosition(this.x+15,this.y).setAngle(90);
        }
    }
}

class Cell extends DraggableComponentWithText {
    EMF: number = CELL_DEFAULT_EMF;
    fire = null;
    _isReversed = false;
    prevPrevCurrent = -10;
    charge: number;

    constructor(scene,x,y) {
        super(scene,x,y,"cell");
    }
    
    onClick(pointer) {
        this._isReversed = !this._isReversed;
        this.setFlipX(this._isReversed);
        this.EMF *= -1;
    }

    clone() {
        return new Cell(this.scene,this.x,this.y);
    }

    updateStuds() {
        if (!this.fire) {
            //var secondChange = this.prevCurrent - this.prevPrevCurrent;
            
            let current = (this.studA.charge + this.prevCurrent - this.studB.charge - this.EMF) / 2;
            this.studA.charge -= current;
            this.studB.charge += current;

            this.prevPrevCurrent = this.prevCurrent;
            this.prevCurrent = current;
            this.electrons.forEach(e => e.updateOffset(current));
            if (Math.abs(current) > CELL_CURRENT_LIMIT_FOR_FIRE) { this.catchFire(); };
        }
    }

    catchFire() {
        this.fire = new Fire(this.scene, this.x, this.y-10);
        this.on("destroy",() => {this.fire.destroy();})
    }

    getText() {
        return Math.abs(this.EMF).toFixed(0)+"V";
    }

    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x-5,this.y-25).setAngle(0);
        }
        else {
            this.text.setPosition(this.x+15,this.y).setAngle(90);
        }
    }

}



class Ammeter extends DraggableComponentWithText {
    averagedCurrent = 0;

    constructor(scene,x,y) {
        super(scene,x,y,"ammeter");
    }

    clone() {
        return new Ammeter(this.scene,this.x,this.y);
    }

    updateStuds() {
        let current = (this.studA.charge + this.prevCurrent - this.studB.charge) / 2;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));

        this.averagedCurrent = (199*this.averagedCurrent + current)/200;
    }

    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x-5,this.y-25);
        }
        else {
            this.text.setPosition(this.x+20,this.y);
        }
    }

    getText() { return Math.abs(this.averagedCurrent*CURRENT_MAGNIFYING_FACTOR*1000).toFixed(0)+"mA" };
}


class Voltmeter extends DraggableComponentWithText {
    constructor(scene,x,y) {
        super(scene,x,y,"voltmeter");
    }

    clone() {
        return new Voltmeter(this.scene,this.x,this.y);
    }

    updateStuds() {
        let current = 0;
    }

    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x-5,this.y-25);
        }
        else {
            this.text.setPosition(this.x+20,this.y);
        }
    }

    getText() {
        var pd = this.studA.charge - this.studB.charge;
        return Math.abs(pd).toFixed(2)+"V";
    }
}
