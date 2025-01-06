import { IocAdapter } from 'routing-controllers';
import { AwilixContainer } from 'awilix';

export class AwilixAdapter implements IocAdapter {
  constructor(private readonly container: AwilixContainer) {}

  get<T>(someClass: { new (...args: any[]): T }): T {
    let resolved = this.container.resolve(someClass.name, {
      allowUnregistered: true,
    });

    if (!resolved) {
      const camelCaseName = someClass.name.charAt(0).toLowerCase() + someClass.name.slice(1);
      resolved = this.container.resolve(camelCaseName);
    }

    return resolved;
  }
}
