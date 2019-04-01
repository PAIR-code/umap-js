/* Copyright 2019 Google LLC. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

function generateGaussian(mean: number, std: number, rng = Math.random) {
  const u1 = tauRand(rng);
  const u2 = tauRand(rng);

  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2);

  return z0 * std + mean;
}

/**
 * Creates a random normal distribution with given mean and stdev.
 */
export function randomNormal2d(
  mean = 0,
  stdev = 1,
  size: number[] = [1, 1],
  rng = Math.random
) {
  return Array(size[0])
    .fill(0)
    .map(() => {
      return Array(size[1])
        .fill(0)
        .map(() => generateGaussian(mean, stdev, rng));
    });
}

/**
 * Simple random integer function
 */
export function tauRandInt(n: number, random = Math.random) {
  return Math.floor(random() * n);
}

/**
 * Simple random float function
 */
export function tauRand(random = Math.random) {
  return random();
}

/**
 * Compute the (standard l2) norm of a vector.
 */
export function norm(vec: number[]) {
  let result = 0;
  for (let item of vec) {
    result += item ** 2;
  }
  return Math.sqrt(result);
}

/**
 * Creates an empty array (filled with undefined)
 */
export function empty(n: number): undefined[] {
  const output: undefined[] = [];
  for (let i = 0; i < n; i++) {
    output.push(undefined);
  }
  return output;
}

/**
 * Creates an array filled with index values
 */
export function range(n: number): number[] {
  return empty(n).map((_, i) => i);
}

/**
 * Creates an array filled with a specific value
 */
export function filled(n: number, v: number): number[] {
  return empty(n).map(() => v);
}

/**
 * Creates an array filled with zeros
 */
export function zeros(n: number): number[] {
  return filled(n, 0);
}

/**
 * Creates an array filled with ones
 */
export function ones(n: number): number[] {
  return filled(n, 1);
}

/**
 * Creates an array from a to b, of length len, inclusive
 */
export function linear(a: number, b: number, len: number): number[] {
  return empty(len).map((_, i) => {
    return a + i * ((b - a) / (len - 1));
  });
}

/**
 * Returns the sum of an array
 */
export function sum(input: number[]): number {
  return input.reduce((sum, val) => sum + val);
}

/**
 * Returns the mean of an array
 */
export function mean(input: number[]): number {
  return sum(input) / input.length;
}

/**
 * Returns the maximum value of an array
 */
export function max(input: number[]): number {
  let max = 0;
  for (let i = 0; i < input.length; i++) {
    max = input[i] > max ? input[i] : max;
  }
  return max;
}

/**
 * Returns the maximum value of a 2d array
 */
export function max2d(input: number[][]): number {
  let max = 0;
  for (let i = 0; i < input.length; i++) {
    for (let j = 0; j < input[i].length; j++) {
      max = input[i][j] > max ? input[i][j] : max;
    }
  }
  return max;
}
