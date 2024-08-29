import BasePlugin, { BasePluginEvents } from "../base-plugin"
import EventEmitter from "../event-emitter"

export type AxeEvent = {idx:number, value:number}
export type ButtonEvent = {idx: number}

export type GamepadPluginOptions = undefined

export type GamepadPluginEvents = BasePluginEvents & {
    "button-pressed": [event: ButtonEvent]
    "button-released": [event: ButtonEvent]
    "axe-value-updated": [event: AxeEvent]
    "axe-pushed": [event: AxeEvent]
    "axe-released": [event: AxeEvent]
}


class GamepadControl extends EventEmitter<GamepadPluginEvents>{
    public gamepad: Gamepad | null = null;
    
    private buttonStates: boolean[] = [];
    private axeValues: number[] = [];
    private requestUpdateID: number = 0;

    constructor(){
        super();
        window.addEventListener("gamepadconnected", (event: GamepadEvent) => {
            this.gamepad = event.gamepad;
            this.buttonStates = new Array(this.gamepad.buttons.length).fill(false);
            this.axeValues = new Array(this.gamepad.axes.length).fill(0.);
        });

        window.addEventListener("gamepaddisconnected", (event: GamepadEvent) => {
            this.gamepad = null;
            window.cancelAnimationFrame(this.requestUpdateID);
        });

        // need to bind poll method to use "this" when poll is called by requestAnimationFrame
        this.poll = this.poll.bind(this);
    }

    public start(): void {
        window.requestAnimationFrame(this.poll);
    }

    public isButtontPressed(idx: number): boolean {
        return this.buttonStates[idx];
    }

    private checkButtonEvent(): void {
        if(!this.gamepad) return;

        for(let idx = 0; idx < this.gamepad.buttons.length; idx++){
            const button = this.gamepad.buttons[idx];
            const isPressed = button.pressed;
            // button press event
            if(isPressed && !this.buttonStates[idx]){
                this.emit("button-pressed", {idx});
            }
            // button release event
            else if(!isPressed && this.buttonStates[idx]) {
                this.emit("button-released", {idx});
            }

            this.buttonStates[idx] = isPressed;
        }
    }

    private checkAxeEvent(): void {
        if(!this.gamepad) return;
        for(let idx = 0; idx < this.gamepad.axes.length; idx++){
            const value = this.gamepad.axes[idx];
            // 0.01 is the dead zone limit
            if(Math.abs(value) < 0.01 && Math.abs(this.axeValues[idx]) > 0.01){
                this.emit("axe-released", {idx, value});
            }
            else if(Math.abs(value) > 0.01){
                this.emit("axe-pushed", {idx, value});
            }
            else if(Math.abs(value - this.axeValues[idx]) > 0.01){
                this.emit("axe-value-updated", {idx, value});
            }

            this.axeValues[idx] = value;
        }
    }

    private poll(): void {
        if(this.gamepad){
            this.checkButtonEvent();
            this.checkAxeEvent();
        }
        window.requestAnimationFrame(this.poll);
    }

}

export default class GamepadPlugin extends BasePlugin<GamepadPluginEvents, GamepadPluginOptions>{
    private gamepadControl: GamepadControl;

    constructor(options?: GamepadPluginOptions){
        super(options);
        this.gamepadControl = new GamepadControl();

    }

    public static create(options?: GamepadPluginOptions) {
        return new GamepadPlugin(options);
    }

    public isButtonPressed(idx: number): boolean {
        return this.gamepadControl.isButtontPressed(idx);
    }

    public on<EventName extends keyof GamepadPluginEvents>(
        event: EventName,
        listener: (...args: GamepadPluginEvents[EventName]
    ) => void, options?: { once?: boolean }): () => void {
        return this.gamepadControl.on(event, listener, options);
    }

    onInit(): void {
        if(!this.wavesurfer){
            throw Error("Wavesurfer is not initialized");
        }
        this.gamepadControl.start();
        this.subscriptions.push()
    }
}
