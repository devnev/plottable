///<reference path="../reference.ts" />

module Plottable {

export type DatasetCallback = (dataset: Dataset) => void;

export class KeyFunctions {
  protected static counter: number = 0;
  public static noConstancy: (d: any, i: number) => any = (d: any, i: number) => {
    return KeyFunctions.counter++;
  };
  public static useIndex: (d: any, i: number) => any = (d: any, i: number) => {
    return i;
  };
  public static useProperty(propertyname: string) {
    return (d: any, i: number) => { return d[propertyname] };
  };
}

export class Dataset {
  private _data: any[];
  private _metadata: any;
  private _key: (datum: any, index: number) => any = KeyFunctions.useIndex;
  private _callbacks: Utils.CallbackSet<DatasetCallback>;

  /**
   * A Dataset contains an array of data and some metadata.
   * Changes to the data or metadata will cause anything subscribed to the Dataset to update.
   *
   * @constructor
   * @param {any[]} [data=[]] The data for this Dataset.
   * @param {any} [metadata={}] An object containing additional information.
   */
  constructor(data: any[] = [], metadata: any = {}) {
    this._data = data;
    this._metadata = metadata;
    this._callbacks = new Utils.CallbackSet<DatasetCallback>();
  }

  /**
   * Adds a callback to be called when the Dataset updates.
   *
   * @param {DatasetCallback} callback.
   * @returns {Dataset} The calling Dataset.
   */
  public onUpdate(callback: DatasetCallback) {
    this._callbacks.add(callback);
    return this;
  }

  /**
   * Removes a callback that would be called when the Dataset updates.
   *
   * @param {DatasetCallback} callback
   * @returns {Dataset} The calling Dataset.
   */
  public offUpdate(callback: DatasetCallback) {
    this._callbacks.delete(callback);
    return this;
  }

  /**
   * Gets the data.
   *
   * @returns {any[]}
   */
  public data(): any[];
  /**
   * Sets the data.
   *
   * @param {any[]} data
   * @returns {Dataset} The calling Dataset.
   */
  public data(data: any[]): Dataset;
  public data(data?: any[]): any {
    if (data == null) {
      return this._data;
    } else {
      this._data = data;
      this._callbacks.callCallbacks(this);
      return this;
    }
  }

  /**
   * Gets the metadata.
   *
   * @returns {any}
   */
  public metadata(): any;
  /**
   * Sets the metadata.
   *
   * @param {any} metadata
   * @returns {Dataset} The calling Dataset.
   */
  public metadata(metadata: any): Dataset;
  public metadata(metadata?: any): any {
    if (metadata == null) {
      return this._metadata;
    } else {
      this._metadata = metadata;
      this._callbacks.callCallbacks(this);
      return this;
    }
  }

  public key(): (datum: any, index: number) => any;
  /**
   * Sets the key.
   *
   * @param { (d: any, i: number) => any} key
   * @returns {Dataset} The calling Dataset.
   */
  public key(key: (datum: any, index: number) => any): Dataset;
  public key(key?: (datum: any, index: number) => any): any {
    if (key == null) {
      return this._key;
    } else {
      this._key = key;
      this._callbacks.callCallbacks(this);
      return this;
    }
  }
}
}
