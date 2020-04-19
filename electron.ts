
class Electron extends Phaser.GameObjects.Sprite {
    offset = 0; //add up current at each component
    component: DraggableComponent = null;
    prevOffset = 0;
    scene: Scene1;

    constructor(scene,x,y,paramComponent,paramOffset) {  
        super(scene, x, y, "electron");
        this.scene = scene;
        scene.add.existing(this);
        this.setDepth(-2);
        this.component = paramComponent;
        this.offset = paramOffset;
        //this.setScale(2);
    }

    //called every frame
    updatePosition(componentX,componentY,isHor) {
        if (isHor) {
            this.y = componentY;
            this.x = componentX + this.offset;
            //console.log(this.offset);
        }
        else {
            this.x = componentX;
            this.y = componentY + this.offset;
        }   
    }

    //called every calculation
    updateOffset(current) {
        this.prevOffset = this.offset;
        this.offset += current * this.scene.ELECTRON_SPEED * (this.scene.ELECTRONS_ARE_POSITIVE ? 1 : -1);

        //EMIT ELECTRON IF PASSING THROUGH OFFSET 62.5
        if ((this.offset < 0) != (this.prevOffset < 0) && this.component.causesElectronVoltageGain) {
            this.gainVoltage(current > 0);
        }

        var possibleComponents = [];
        var stud = null;
        var extraOffset = null; 
        if (this.offset > 62.5) { //find studB and go to another branch with outward current
            stud = this.component.studB;
            extraOffset = this.offset - 62.5;
        }
        else if (this.offset < -62.5) { //find studA and go to another branch with outward current
            stud = this.component.studA;
            extraOffset = -62.5 - this.offset;
        }
        else {
            return; //offset is between 0 and 125 so do not move to a different component
        }
        var nextChosen;
        [nextChosen,this.offset]  = stud.nextComponentForElectron(extraOffset);
        if (nextChosen == null) {
            //this.offset = ((this.offset % 125 + 125) % 125) - 62.5;
            removeItemFromArray(this,this.component.electrons);
            this.destroy();
            console.log("none found");
            return;
        }
        removeItemFromArray(this,this.component.electrons);
        this.component = nextChosen;
        nextChosen.electrons.push(this);
        //this.updatePosition(nextChosen.x,nextChosen.y,nextChosen.isHor);
    }

    gainVoltage(currentIsPositive) {
        var diff = (currentIsPositive ? -1 : 1) * (this.component.studA.voltage - this.component.studB.voltage);
        var text =  ((diff > 0) ? "+" : "") + diff.toFixed(1)+"V"; 
        var tb = this.scene.add.text(this.x-5, this.y-5, text, {
            fill:ELECTRON_COLOR ,
            fontSize:this.scene.FONT_SIZE.toString() + "px",
            fontFamily:FONT
          });
        var tween = this.scene.tweens.add({
            targets: tb,
            x: this.x-50,
            y: this.y-50,
            ease: 'Cubic.easeOut',
            duration: 2000,
            yoyo: false,
            repeat: 0,
            onComplete:  () =>  { 
                tb.destroy(); 
            }
        });
    }
}