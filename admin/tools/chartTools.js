const { tool } = require('@langchain/core/tools');
const { z } = require('zod');

const generateApexChartTool = tool(
  async ({ chartType, title, categories, seriesName, data }) => {
    const config = {
      chart: { type: chartType, height: 350 },
      title: { text: title },
      xaxis: { categories },
      series: [{ name: seriesName, data }]
    };
    return JSON.stringify(config);
  },
  {
    name: 'generate_apex_chart',
    description: 'Generate an ApexCharts configuration to visualize data as a chart. Use this when the user asks for a chart, graph, or visual representation of data.',
    schema: z.object({
      chartType: z.enum(['bar', 'line', 'pie', 'area']).describe('Type of chart to generate'),
      title: z.string().describe('Title of the chart'),
      categories: z.array(z.string()).describe('Labels for the x-axis or pie slices'),
      seriesName: z.string().describe('Name of the data series'),
      data: z.array(z.number()).describe('Data values corresponding to each category'),
    }),
  }
);

module.exports = { generateApexChartTool };