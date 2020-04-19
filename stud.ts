

class Stud extends Phaser.GameObjects.Sprite {
    _charge: number = 0;
    voltageText: Phaser.GameObjects.Text;
    random = PHI;
    capacitance = DEFAULT_STUD_CAPACITANCE;
    scene: Scene1;

    connectedComponents  = {
        "top": null, "bottom": null, "right": null, "left": null  
    };

    constructor(scene,x,y) {
        super(scene,x,y,"stud");
        scene.add.existing(this);
        this.scene = scene;

        this.voltageText = this.scene.add.text(this.x-25, this.y-20, "", {
            fill:"#000",
            fontSize:this.scene.FONT_SIZE.toString() + "px",
            fontFamily:FONT
          }).setVisible(false);
        
        this.scene.textObjects.push(this.voltageText);
    }
    
    get voltage() { return this._charge / this.capacitance }

    get charge() { return this._charge; }

    set charge(value) {      
        this._charge = ((STUD_VOLTAGE_MEAN_SAMPLE_SIZE -1)*this._charge + value)/STUD_VOLTAGE_MEAN_SAMPLE_SIZE ;

        this.voltageText.setText(this.voltage < 0.05 ? "0V" : this.voltage.toFixed(1)+"V"); 
    }

    getComponentDirection(c) {
        if (c.x == this.x) {
            return c.y > this.y ? "bottom" : "top";
        }
        else {
            return c.x > this.x ? "right" : "left";
        }
    }

    addComponent(c) {
        var dir = this.getComponentDirection(c);
        if (!c[dir]) {
            this.connectedComponents[dir] = c;
        }
        if (this.scene.SHOW_STUD_VOLTAGES) { this.voltageText.setVisible(true); }
    }

    removeComponent(c) {
        var dir = this.getComponentDirection(c);
        this.connectedComponents[dir] = null;
        if (!this.hasAnyComponents()) {
            this.voltageText.setVisible(false);
        }
    }

    hasAnyComponents() {
        return objectSome(this.connectedComponents,item => item != null);
    }

    nextComponentForElectron(extraOffset) {
        var ret = [];
        var currents = [];
        if (this.connectedComponents["top"] && 
        (this.scene.ELECTRONS_ARE_POSITIVE ? this.connectedComponents["top"].prevCurrent < 0 : this.connectedComponents["top"].prevCurrent > 0) 
        )
            { 
                ret.push([this.connectedComponents["top"],62.5-extraOffset]);
                currents.push(Math.abs(this.connectedComponents["top"].prevCurrent));
            };
        if (this.connectedComponents["right"] && 
        (this.scene.ELECTRONS_ARE_POSITIVE ? this.connectedComponents["right"].prevCurrent > 0 :  this.connectedComponents["right"].prevCurrent < 0) 
        )
            { 
                ret.push([this.connectedComponents["right"],-62.5+extraOffset]);
                currents.push(Math.abs(this.connectedComponents["right"].prevCurrent));
            };
        if (this.connectedComponents["bottom"] && 
        (this.scene.ELECTRONS_ARE_POSITIVE ?  this.connectedComponents["bottom"].prevCurrent > 0 :  this.connectedComponents["bottom"].prevCurrent < 0) 
        )
            { 
                ret.push([this.connectedComponents["bottom"],-62.5+extraOffset])
                currents.push(Math.abs(this.connectedComponents["bottom"].prevCurrent));
            };
        if (this.connectedComponents["left"] && 
        (this.scene.ELECTRONS_ARE_POSITIVE ? this.connectedComponents["left"].prevCurrent < 0 : this.connectedComponents["left"].prevCurrent > 0)
        ) 
            { 
                ret.push([this.connectedComponents["left"],62.5-extraOffset])
                currents.push(Math.abs(this.connectedComponents["left"].prevCurrent));
            };
        if (ret.length == 0) {return [null,0];}

        //pseudo random thing using golden ratio
        var sumOfCurrents = currents.reduce((a,b) => a+b,0);
        var picked = sumOfCurrents * this.random;

        //choose next random
        this.random = (this.random + PHI) % 1;
        
        if (picked < currents[0]) {return ret[0]};
        if (picked < currents[0]+currents[1]) {return ret[1]};
        if (picked < currents[0]+currents[1]+currents[2]) {return ret[2]};
        return ret[3];

    }
}



