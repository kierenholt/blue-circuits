
class Fire extends Phaser.GameObjects.Sprite {
    constructor(scene,x,y) {  
        super(scene, x, y, "fire");
        this.setScale(2);
        this.play("allFire"); 
        scene.add.existing(this);
        //this.play('allFire');
    }
}
