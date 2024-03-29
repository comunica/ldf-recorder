import { newEngine } from "@comunica/actor-init-sparql";
import { Bindings } from "@comunica/bus-query-operation";
import { Quad } from "rdf-js";
import { IQueryResult, IQuerySource } from "./IRecorder";

/**
 * A class which executes SPARQL-queries on a TPF endpoint that can be recorded
 */
export class QueryExecutor {

  public readonly myEngine: any;

  constructor(engine?: any) {
    // Use comunica engine by default.
    this.myEngine = engine ? engine : newEngine();
  }

  /**
   * Run the SPARQL query over the sources and return the result (as Bindings) so that
   * it can be recorded and saved too
   * @param queryString The SPARQL-query string
   * @param tpfSources A list of remote TPF endpoints
   */
  public async runQuery(queryString: string, tpfSources: string[]): Promise<IQueryResult> {
    const queryType: QueryType = this.getQueryType(queryString);
    const querySources: IQuerySource[] = this.mapSources(tpfSources);
    return new Promise(async (resolve, reject) => {
      switch (queryType) {
      case QueryType.SELECT:
        const rss: Bindings[] = [];
        const rs = await this.myEngine.query(queryString, { sources: querySources });
        await rs.bindingsStream.on('data', (data: Bindings) => {
          rss.push(data);
        });
        await rs.bindingsStream.on('end', async () => {
          resolve({type: QueryType.SELECT, value: rss});
        });
        break;
      case QueryType.ASK:
        const ra = await this.myEngine.query(queryString, { sources: querySources });
        resolve({type: QueryType.ASK, value: await ra.booleanResult});
        break;
      case QueryType.CONSTRUCT:
        const rsc: Quad[] = [];
        const rc = await this.myEngine.query(queryString, { sources: querySources });
        await rc.quadStream.on('data', (data: Quad) => {
          rsc.push(data);
        });
        await rc.quadStream.on('end', async () => {
          resolve({type: QueryType.CONSTRUCT, value: rsc});
        });
        break;
      }
    });
  }

  /**
   * Returns an ENUM representing the QueryType of the querystring
   * @param queryString The query
   */
  private getQueryType(queryString: string): QueryType {
    let content = queryString.split('\n');
    let fln = content[0];
    while ( fln.startsWith('PREFIX') || fln.trim() === "" ) {
      content = content.slice(1);
      fln = content[0];
    }
    queryString = content.join('\n');
    switch (queryString.split(' ')[0]) {
    case 'ASK':
      return QueryType.ASK;
    case 'SELECT':
      return QueryType.SELECT;
    case 'CONSTRUCT':
      return QueryType.CONSTRUCT;
    default:
      throw new Error(`The query-type: ${queryString.split(' ')[0]} is unknown or not yet supported`);
    }
  }

  /**
   * Map the sources from the command line interface into IQuerySources used by the query engine
   * @param sources The sources on the command line
   */
  private mapSources(sources: string[]): IQuerySource[] {
    const res = [];
    for (const source of sources) {
      let type = source.split('@')[0];
      const value = source.split('@')[1];
      switch (type) {
      case 'FILE':
        type = 'file';
        break;
      case 'TPF':
        type = '';
        break;
      case 'SPARQL':
        type = 'sparql';
        break;
      default:
        throw new Error(`unsupported sourceType: ${type}`);
      }
      res.push({type, value});
    }
    return res;
  }

}

/**
 * The different QueryTypes the comunica engine and the recorder support
 */
export enum QueryType {
  ASK,
  SELECT,
  CONSTRUCT,
}
