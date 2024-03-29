import * as fs from 'fs';
import * as Path from 'path';
import { ActorQueryResultSerializeSparqlJson } from '@comunica/actor-query-result-serialize-sparql-json';
import type { Quad } from 'n3';
import { Writer } from 'n3';
import type * as RDF from 'rdf-js';
import type { IQueryResult, IWriteConfig } from './IRecorder';
import { QueryType } from './QueryExecutor';

export class ResultWriter {
  private readonly writeConfig: IWriteConfig;

  public constructor(writeConfig: IWriteConfig) {
    this.writeConfig = writeConfig;
  }

  /**
   * Write the QUERY-results to a .srj file
   * @param results The bindings returned from the query-engine
   */
  public writeResultsToFile(results: IQueryResult): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(Path.join(this.writeConfig.directory, `result${this.getResultExtension(results.type)}`),
        this.getResultString(results),
        (err: any) => {
          if (err) {
            reject(new Error(`in writeResultsToFile: could not write TPF-query result to file: result.srj`));
          }
          resolve();
        // Else: ok
        });
    });
  }

  /**
   * Returns the extension of the result file, depening on the QueryType
   * @param type The type of the query
   */
  private getResultExtension(type: QueryType): string {
    switch (type) {
      case QueryType.ASK:
        return '.srj';
      case QueryType.CONSTRUCT:
        return '.ttl';
      case QueryType.SELECT:
        return '.srj';
    }
  }

  /**
   * Return the string representing the result, depending on the QueryType
   * @param results The IQueryResult
   */
  private getResultString(results: IQueryResult): string {
    switch (results.type) {
      case QueryType.SELECT:
        return this.bindingsToSparqlJsonResult(<RDF.Bindings[]> results.value, results.variables);
      case QueryType.ASK:
        return this.booleanToSparqlJsonResult(<boolean> results.value);
      case QueryType.CONSTRUCT:
        return this.quadsToTurtle(<Quad[]> results.value);
    }
  }

  /**
   * Transform the quads in turtle format used for testing
   * @param quads The quads representing the result of the query
   */
  private quadsToTurtle(quads: Quad[]): string {
    const writer = new Writer();
    for (const quad of quads) {
      writer.addQuad(quad);
    }
    let res: string;
    writer.end((error, result: string) => {
      res = result;
    });
    return res;
  }

  /**
   * Transform the bindings to the SPARQLJsonResult format used for testing
   * @param bindings The bindings returned from the query-engine
   */
  private bindingsToSparqlJsonResult(bindings: RDF.Bindings[], variables: string[]): string {
    const head: any = {};
    head.vars = variables.map(key => key);

    const results: any = {};
    results.bindings = [];
    for (const binding of bindings) {
      const bres: any = {};
      binding.forEach((value: RDF.Term, key: RDF.Variable) => {
        bres[key.value] = ActorQueryResultSerializeSparqlJson.bindingToJsonBindings(value);
      });
      results.bindings.push(bres);
    }

    return JSON.stringify({ head, results }, null, 1);
  }

  /**
   * Transform the boolean to the SPARQLJonResult format used for testing
   * @param boolean The boolean returned from the query-engine
   */
  private booleanToSparqlJsonResult(ask: boolean): string {
    return JSON.stringify({ head: {}, boolean: ask });
  }
}
