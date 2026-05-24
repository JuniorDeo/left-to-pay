import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sort',
  pure: true,
  standalone: true
})
export class SortPipe implements PipeTransform {
  transform<T>(array: T[], key: keyof T): T[] {
    if (!array || array.length === 0) {
      return array;
    }

    return [...array].sort((a, b) => {
      const valueA = a[key];
      const valueB = b[key];

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return valueA - valueB;
      }

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return valueA.localeCompare(valueB);
      }

      return 0;
    });
  }
}

