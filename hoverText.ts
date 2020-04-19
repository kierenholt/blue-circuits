function addHoverEvent(sprite: Phaser.GameObjects.Sprite, scene: Phaser.Scene) {

}

class HoverText extends Phaser.GameObjects.Text {
    hoverRect: any;
    component: DraggableComponentWithText;
    scene: Scene1;

    constructor(scene,x,y,text,textStyle,component) {
        super(scene,x,y,text,textStyle);
        this.scene.add.existing(this);
        this.scene = scene;
        this.setInteractive();
        this.setDepth(100);
        this.component = component;
        this.scene.textObjects.push(this);

        this.on("pointerover",(pointer) => {
            if (!this.hoverRect) {
                var bounds = this.getBounds();
                this.hoverRect = this.scene.add.rectangle(bounds.centerX,bounds.centerY,bounds.width,bounds.height).
                    setStrokeStyle(1, Phaser.Display.Color.GetColor(255,0,0)).
                    setRotation(this.rotation);
            }
        });
        this.on("pointerout", (pointer) => {
            if (this.hoverRect) {this.hoverRect.destroy(); this.hoverRect = undefined; }
        })

        this.on("pointerdown",(pointer) => { this.onClick() });

        this.on("destroy", () => {
            if (this.hoverRect) { this.hoverRect.destroy(); }
            removeItemFromArray(this,this.scene.textObjects);
        })
    }

    //prompts to change value
    onClick() {
        var value = window.prompt("set value for component in "+this.component.unit,Math.abs(this.component.value).toString());
        if (isNumeric(value)) { this.component.setValue(value) };
    }



}