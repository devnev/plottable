///<reference path="../reference.ts" />

module Plottable {
  export module Utils {
    export module Stacking {

      export type StackedDatum = {
        value: number;
        offset: number;
      };

      export type StackInformation = Utils.Map<Dataset, Utils.Map<string, StackedDatum>>;

      var nativeMath: Math = (<any>window).Math;

      /**
       * Computes the stacking information (value and offset) for each data point in each Dataset.
       *
       * @param {Dataset[]} datasets The Datasets to be stacked on top of each other in the order of stacking
       * @param {Accessor<any>} keyAccessor Accessor for the key of the data
       * @param {Accessor<number>} valueAccessor Accessor for the value of the data
       * @return {StackInformation} value and offset information for each datapoint in each Dataset
       */
      export function computeStackInformation(
          datasets: Dataset[],
          keyAccessor: Accessor<any>,
          valueAccessor: Accessor<number>): StackInformation {
        var positiveOffsets = d3.map<number>();
        var negativeOffsets = d3.map<number>();
        var datasetToKeyToStackedDatum = new Utils.Map<Dataset, Utils.Map<string, StackedDatum>>();

        datasets.forEach((dataset) => {
          var keyToStackedDatum = new Utils.Map<string, StackedDatum>();
          dataset.data().forEach((datum, index) => {
            var key = normalizeKey(keyAccessor(datum, index, dataset));
            var value = +valueAccessor(datum, index, dataset);
            var offset: number;
            var offsetMap = (value >= 0) ? positiveOffsets : negativeOffsets;
            if (offsetMap.has(key)) {
              offset = offsetMap.get(key);
              offsetMap.set(key, offset + value);
            } else {
              offset = 0;
              offsetMap.set(key, value);
            }
            keyToStackedDatum.set(key, {
              value: value,
              offset: offset
            });
          });
          datasetToKeyToStackedDatum.set(dataset, keyToStackedDatum);
        });
        return datasetToKeyToStackedDatum;
      }

      /**
       * Computes the total extent over all data points in all Datasets, taking stacking into consideration.
       *
       * @param {StackInformation} stackInformation The value and offset information for each datapoint in each dataset
       * @oaram {Accessor<any>} keyAccessor Accessor for the key of the data existent in the stackInformation
       * @param {Accessor<boolean>} filter A filter for data to be considered when computing the total extent
       * @return {[number, number]} The total extent
       */
      export function computeStackExtent(stackInformation: StackInformation, keyAccessor: Accessor<any>, filter: Accessor<boolean>) {
        var extents: number[] = [];
        stackInformation.forEach((stackedDatumMap: Utils.Map<string, StackedDatum>, dataset: Dataset) => {
          dataset.data().forEach((datum, index) => {
            if (filter != null && !filter(datum, index, dataset)) {
              return;
            }
            var stackedDatum = stackedDatumMap.get(normalizeKey(keyAccessor(datum, index, dataset)));
            extents.push(stackedDatum.value + stackedDatum.offset);
          });
        });
        var maxStackExtent = Utils.Math.max(extents, 0);
        var minStackExtent = Utils.Math.min(extents, 0);

        return [nativeMath.min(minStackExtent, 0), nativeMath.max(0, maxStackExtent)];
      }

      /**
       * Given an array of Datasets and the accessor function for the key, computes the
       * set reunion (no duplicates) of the domain of each Dataset. The keys are stringified
       * before being returned.
       *
       * @param {Dataset[]} datasets The Datasets for which we extract the domain keys
       * @param {Accessor<any>} keyAccessor The accessor for the key of the data
       * @return {string[]} An array of stringified keys
       */
      export function domainKeys(datasets: Dataset[], keyAccessor: Accessor<any>) {
        var domainKeys = d3.set();
        datasets.forEach((dataset) => {
          dataset.data().forEach((datum, index) => {
            domainKeys.add(keyAccessor(datum, index, dataset));
          });
        });

        return domainKeys.values();
      }

      /**
       * Normalizes a key used for stacking
       *
       * @param {any} key The key to be normalized
       * @return {string} The stringified key
       */
      export function normalizeKey(key: any) {
        return String(key);
      }

    }
  }
}
