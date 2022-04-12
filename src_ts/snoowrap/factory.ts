import {requestor} from "./requestor";

export default class factory extends requestor {
    static objects: Map<string,Function> = new Map<string,Function>();

    public newObject<Type> (objectType: string, content: any[], _hasFetched?: boolean): any[]
    public newObject<Type> (objectType: string, content: any, _hasFetched?: boolean): Type
    public newObject<Type> (objectType: string, content: any[]|any, _hasFetched = false) {
        if ( Array.isArray(content) ) { return content };
        const constructor = factory.objects.get(objectType);
        if ( constructor != undefined){
            return constructor(content, this, _hasFetched);
        }
        return (void 0);
    }
}

export function snoowrapFactoryConstructible(constructor: Function){
    factory.objects.set(constructor.name, constructor)
}