
class Electron extends Phaser.GameObjects.Sprite {
    offset = 0; //add up current at each component
    component: DraggableComponent = null;

    constructor(scene,x,y,paramComponent,paramOffset) {  
        super(scene, x, y, "electron");
        scene.add.existing(this);
        this.depth = -1;
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
        this.offset += current * ELECTRON_SPEED;

        
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
            return; //offset is between 0 and 125 so do not move components!
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

}
