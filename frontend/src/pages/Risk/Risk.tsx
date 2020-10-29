import React, { useCallback, useState, useEffect } from 'react';
import classes from './Risk.module.scss';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { useAuthContext } from 'context';
import { Checkbox, Grid } from '@trussworks/react-uswds';
import { makeStyles, Paper } from '@material-ui/core';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { useHistory } from 'react-router-dom';

const geoStateUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
const geoCountyUrl =
  'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json';

let colorScale = scaleLinear<string>()
  .domain([0, 1])
  .range(['#c7e8ff', '#135787']);

const allColors = ['rgb(0, 111, 162)', 'rgb(0, 185, 227)'];

const getSingleColor = ({ id }: { id: string }) => {
  return '#FFBC78';
};

const getSeverityColor = ({ id }: { id: string }) => {
  if (id === 'None') return 'rgb(255, 255, 255)';
  else if (id === 'Low') return '#F8DFE2';
  else if (id === 'Medium') return '#F2938C';
  else if (id === 'High') return '#B51D09';
  else return '#540C03';
};

interface Point {
  id: string;
  label: string;
  value: number;
}

interface Stats {
  domains: {
    services: Point[];
    ports: Point[];
    numVulnerabilities: Point[];
    total: number;
  };
  vulnerabilities: {
    severity: Point[];
    byOrg: Point[];
  };
}

interface ApiResponse {
  result: Stats;
}

const Risk: React.FC = (props) => {
  const history = useHistory();
  const { currentOrganization, user, apiPost } = useAuthContext();

  const [stats, setStats] = useState<Stats | undefined>(undefined);
  const [showAll, setShowAll] = useState<boolean>(
    JSON.parse(localStorage.getItem('showGlobal') ?? 'false')
  );
  const cardClasses = useStyles(props);

  const updateShowAll = (state: boolean) => {
    setShowAll(state);
    localStorage.setItem('showGlobal', JSON.stringify(state));
  };

  const fetchStats = useCallback(async () => {
    const { result } = await apiPost<ApiResponse>('/stats', {
      body: {
        filters: showAll
          ? {}
          : {
              organization: currentOrganization?.id
            }
      }
    });
    const max = Math.max(...result.vulnerabilities.byOrg.map((p) => p.value));
    colorScale = scaleLinear<string>()
      .domain([0, Math.log(max)])
      .range(['#c7e8ff', '#135787']);
    setStats(result);
  }, [showAll, apiPost, currentOrganization]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const MyResponsivePie = ({
    data,
    colors,
    type
  }: {
    data: Point[];
    colors: any;
    type: string;
  }) => {
    return (
      <ResponsivePie
        data={data as any}
        innerRadius={0.5}
        padAngle={0.7}
        radialLabelsSkipAngle={10}
        slicesLabelsSkipAngle={10}
        colors={colors}
        onClick={(event) => {
          if (type === 'vulns') {
            history.push(`/vulnerabilities?severity=${event.id}`);
          }
        }}
      />
    );
  };

  const MyResponsiveBar = ({
    data,
    xLabels,
    type,
    longXValues = false
  }: {
    data: Point[];
    xLabels: string[];
    type: string;
    longXValues?: boolean;
  }) => {
    let keys: string[];
    let dataVal: object[];
    if (type === 'ports') {
      keys = xLabels;
      dataVal = data.map((e) => ({ ...e, [xLabels[0]]: e.value })) as any;
    } else {
      let domainToSevMap: any = {};
      for (let point of data) {
        let split = point.id.split('|');
        let domain = split[0];
        let severity = split[1];
        if (!(domain in domainToSevMap)) domainToSevMap[domain] = {};
        domainToSevMap[domain][severity] = point.value;
      }
      keys = xLabels;
      dataVal = Object.keys(domainToSevMap)
        .map((key) => ({
          label: key,
          ...domainToSevMap[key]
        }))
        .sort((a, b) => {
          let diff = 0;
          for (var label of xLabels) {
            diff += (label in b ? b[label] : 0) - (label in a ? a[label] : 0);
          }
          return diff;
        })
        .slice(0, 15)
        .reverse();
    }
    return (
      <ResponsiveBar
        data={dataVal}
        keys={keys}
        indexBy="label"
        margin={{
          top: 0,
          right: 0,
          bottom: longXValues ? 100 : 0,
          left: longXValues ? 200 : 60
        }}
        onClick={(event) => {
          if (type === 'vulns') {
            history.push(
              `/vulnerabilities?domain=${event.data.label}&severity=${event.id}`
            );
          }
        }}
        padding={0.5}
        colors={type === 'ports' ? getSingleColor : getSeverityColor}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: longXValues ? 90 : 0,
          legend: xLabels.length > 1 ? '' : xLabels[0],
          legendPosition: 'middle',
          legendOffset: 40
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        animate={true}
        motionStiffness={90}
        motionDamping={15}
        layout={'horizontal'}
      />
    );
  };

  return (
    <div className={classes.root}>
      <Grid row>
        <Grid style={{ float: 'right' }}>
          {((user?.roles && user.roles.length > 1) ||
            user?.userType === 'globalView' ||
            user?.userType === 'globalAdmin') && (
            <Checkbox
              id="showAll"
              name="showAll"
              label="Show all organizations"
              checked={showAll}
              onChange={(e) => updateShowAll(e.target.checked)}
              className={classes.showAll}
            />
          )}
        </Grid>
      </Grid>

      <div className={cardClasses.contentWrapper}>
        {stats && (
          <div className={cardClasses.content}>
            <div className={cardClasses.panel}>
              {stats.domains.services.length > 0 && (
                <Paper elevation={0} className={cardClasses.cardRoot}>
                  <div className={cardClasses.cardSmall}>
                    <div className={cardClasses.header}>
                      <h2>Alerts</h2>
                    </div>
                    <h4>Today:</h4>
                  </div>
                </Paper>
              )}

              {stats.domains.services.length > 0 && (
                <Paper elevation={0} className={cardClasses.cardRoot}>
                  <div className={cardClasses.cardSmall}>
                    <div className={cardClasses.header}>
                      <h2>Most common services</h2>
                    </div>
                    <MyResponsivePie
                      data={stats.domains.services}
                      colors={allColors}
                      type={'services'}
                    />
                  </div>
                </Paper>
              )}

              {stats.domains.ports.length > 0 && (
                <Paper elevation={0} classes={{ root: cardClasses.cardRoot }}>
                  <div className={cardClasses.cardSmall}>
                    <div className={cardClasses.header}>
                      <h2>Most common ports</h2>
                    </div>
                    <MyResponsiveBar
                      data={stats.domains.ports.slice(0, 5).reverse()}
                      type={'ports'}
                      xLabels={['Port']}
                    />
                  </div>
                </Paper>
              )}
              {stats.vulnerabilities.severity.length > 0 && (
                <Paper elevation={0} classes={{ root: cardClasses.cardRoot }}>
                  <div className={cardClasses.cardSmall}>
                    <div className={cardClasses.header}>
                      <h2>Severity Levels</h2>
                    </div>
                    <MyResponsivePie
                      data={stats.vulnerabilities.severity}
                      colors={getSeverityColor}
                      type={'vulns'}
                    />
                  </div>
                </Paper>
              )}
            </div>

            <div className={cardClasses.panel}>
              <Paper elevation={0} classes={{ root: cardClasses.cardRoot }}>
                <div className={cardClasses.inner}>
                  {stats.domains.numVulnerabilities.length > 0 && (
                    <div className={cardClasses.cardBig}>
                      <div className={cardClasses.header}>
                        <h2>Open Vulnerabilities by Domain</h2>
                      </div>
                      <MyResponsiveBar
                        data={stats.domains.numVulnerabilities}
                        xLabels={['Critical', 'High', 'Medium', 'Low']}
                        type={'vulns'}
                        longXValues={true}
                      />
                    </div>
                  )}
                </div>
              </Paper>
            </div>
            <div className={cardClasses.panel}>
              <Paper elevation={0} classes={{ root: cardClasses.cardRoot }}>
                <div className={cardClasses.inner}>
                  {user?.userType === 'globalView' ||
                    (user?.userType === 'globalAdmin' && (
                      <>
                        <div className={classes.chart}>
                          <h3>State vulnerabilities</h3>
                          <ComposableMap
                            projection="geoAlbersUsa"
                            style={{
                              width: '50%',
                              display: 'block',
                              margin: 'auto'
                            }}
                          >
                            <Geographies geography={geoStateUrl}>
                              {({ geographies }) =>
                                geographies.map((geo) => {
                                  const cur = stats?.vulnerabilities.byOrg.find(
                                    (p) => p.label === geo.properties.name
                                  );
                                  return (
                                    <Geography
                                      key={geo.rsmKey}
                                      geography={geo}
                                      fill={colorScale(
                                        cur ? Math.log(cur.value) : 0
                                      )}
                                    />
                                  );
                                })
                              }
                            </Geographies>
                          </ComposableMap>
                        </div>
                        <div className={classes.chart}>
                          <h3>State vulnerabilities (counties)</h3>
                          <ComposableMap
                            projection="geoAlbersUsa"
                            style={{
                              width: '50%',
                              display: 'block',
                              margin: 'auto'
                            }}
                          >
                            <Geographies geography={geoStateUrl}>
                              {({ geographies }) =>
                                geographies.map((geo) => {
                                  const cur = stats?.vulnerabilities.byOrg.find(
                                    (p) =>
                                      p.label ===
                                      geo.properties.name + ' Counties'
                                  );
                                  return (
                                    <Geography
                                      key={geo.rsmKey}
                                      geography={geo}
                                      fill={colorScale(
                                        cur ? Math.log(cur.value) : 0
                                      )}
                                    />
                                  );
                                })
                              }
                            </Geographies>
                          </ComposableMap>
                        </div>

                        <div className={classes.chart}>
                          <h3>County Vulnerabilities</h3>
                          <ComposableMap
                            projection="geoAlbersUsa"
                            style={{
                              width: '50%',
                              display: 'block',
                              margin: 'auto'
                            }}
                          >
                            <Geographies geography={geoCountyUrl}>
                              {({ geographies }) =>
                                geographies.map((geo) => {
                                  const cur = stats?.domains.numVulnerabilities.find(
                                    (p) =>
                                      p.label.includes(
                                        geo.properties.name.toLowerCase()
                                      )
                                  );
                                  return (
                                    <Geography
                                      key={geo.rsmKey}
                                      geography={geo}
                                      fill={colorScale(
                                        cur ? Math.log(cur.value) : 0
                                      )}
                                    />
                                  );
                                })
                              }
                            </Geographies>
                          </ComposableMap>
                        </div>
                      </>
                    ))}
                </div>
              </Paper>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Risk;

const useStyles = makeStyles((theme) => ({
  cardRoot: {
    boxSizing: 'border-box',
    marginBottom: '1rem',
    border: '2px solid #DCDEE0',
    boxShadow: 'none',
    '& em': {
      fontStyle: 'normal',
      backgroundColor: 'yellow'
    }
  },
  cardSmall: {
    width: '100%',
    height: '300px',
    '& h3': {
      textAlign: 'center'
    },
    overflow: 'hidden'
  },
  cardBig: {
    width: '100%',
    height: '700px',
    '& h3': {
      textAlign: 'center'
    },
    overflow: 'hidden'
  },
  header: {
    height: '60px',
    backgroundColor: '#F8F9FA',
    top: 0,
    width: '100%',
    color: '#07648D',
    fontWeight: 500,
    paddingLeft: 20,
    paddingTop: 1
    // fontSize: '20px'
  },
  inner: {},
  root: {
    position: 'relative',
    flex: '1',
    width: '100%',
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'stretch',
    margin: '0',
    overflowY: 'hidden'
  },
  contentWrapper: {
    position: 'relative',
    flex: '1 1 auto',
    height: '100%',
    display: 'flex',
    flexFlow: 'column nowrap',
    overflowY: 'hidden'
  },
  content: {
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'stretch',
    flex: '1',
    overflowY: 'hidden'
  },
  panel: {
    position: 'relative',
    height: '100%',
    overflowY: 'auto',
    padding: '0 1rem 2rem 1rem',
    flex: '0 0 50%'
  }
}));
