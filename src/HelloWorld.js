/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2020 Looker Data Sciences, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import React, { useEffect, useState, useContext, useCallback } from 'react'
import { 
    ComponentsProvider, 
    Card, CardContent, 
    Flex, FlexItem, 
    Tree, TreeItem, 
    Space, SpaceVertical, 
    Heading, ToggleSwitch
  } from '@looker/components'
import { ExtensionContext } from '@looker/extension-sdk-react'
import { LookerEmbedSDK } from '@looker/embed-sdk'
import styled from "styled-components"
import { paddingBottom } from 'styled-system'

const EmbedContainer = styled.div`
  width: 100%;
  height: 95vh;
  & > iframe {
    width: 100%;
    height: 100%;
  }
`
export const HelloWorld = () => {
  const { core40SDK, extensionSDK } = useContext(ExtensionContext)
  const [qid, setQid] = useState();
  const [geos, setGeos] = useState();
  const [state, setState] = useState();
  const [explore, setExplore] = useState();
  const [on, setOn] = React.useState(false)
  

useEffect(() => {
    const initialize = async () => {
      try {
        const states = await core40SDK.ok(core40SDK.run_inline_query(
          {
            result_format: 'json',
            limit: 1000,
            body: {
               total: true
              ,model: 'join20'
              ,view: 'order_items'
              ,fields: ['users.country','users.state']
              ,filters: {'users.country':'USA'}
              ,sorts:['users.state']
            },
          }
          ))
        setGeos(
          states.map((state )=>{
            return  <TreeItem onClick={async () => { setState(state['users.state']) }} icon="FieldLocation"> 
                      {state['users.state']}
                    </TreeItem>
                    })
        )
      } catch (error) {
        console.error(error)
      }
    }
    getQid('California')
    initialize()
  },[])

//Listens for changes in the state variable (which changes onclick of the tree) and updates the embed query filters
useEffect(() => {
  if (state && explore) {
    explore.updateFilters({'users.state': state})
    explore.run()
  }
  }
, [state])

/*
Uses the state variable to call Looker's API and get a new qid. 
Also internally uses the `on` variable to determine the measure field visualized
*/
const getQid = async (state) => {
    let visconfig = {
      "map_plot_mode": "points",
      "heatmap_gridlines": false,
      "heatmap_gridlines_empty": false,
      "heatmap_opacity": 0.5,
      "show_region_field": true,
      "draw_map_labels_above_data": true,
      "map_tile_provider": "light",
      "map_zoom": 6,
      "map_scale_indicator": "off",
      "map_pannable": true,
      "map_zoomable": true,
      "map_marker_type": "circle",
      "map_marker_icon_name": "default",
      "map_marker_radius_mode": "proportional_value",
      "map_marker_units": "meters",
      "map_marker_proportional_scale_type": "linear",
      "map_marker_color_mode": "value",
      "show_view_names": false,
      "show_legend": true,
      "quantize_map_value_colors": false,
      "reverse_map_value_colors": false,
      "type": "looker_map",
      "x_axis_gridlines": false,
      "y_axis_gridlines": true,
      "show_y_axis_labels": true,
      "show_y_axis_ticks": true,
      "y_axis_tick_density": "default",
      "y_axis_tick_density_custom": 5,
      "show_x_axis_label": true,
      "show_x_axis_ticks": true,
      "y_axis_scale_mode": "linear",
      "x_axis_reversed": false,
      "y_axis_reversed": false,
      "plot_size_by_field": false,
      "trellis": "",
      "stacking": "",
      "limit_displayed_rows": false,
      "legend_position": "center",
      "point_style": "none",
      "show_value_labels": false,
      "label_density": 25,
      "x_axis_scale": "auto",
      "y_axis_combined": true,
      "ordering": "none",
      "show_null_labels": false,
      "show_totals_labels": false,
      "show_silhouette": false,
      "totals_color": "#808080",
      "defaults_version": 1,
      "hidden_fields": [
          "users.id"
      ],
      "series_types": {}
    }
    const response = await core40SDK.ok(
        core40SDK.create_query({
                              view:'order_items',
                              model:'join20',
                              fields: [
                                  on ? "order_items.total_profit" : "order_items.count", 
                                  "users.location", 
                                  "users.id"
                                  ],
                              filters:{'users.state':state}, 
                              sorts:['order_items.total_profit desc'],
                              vis_config: visconfig 
                            })
                          )
    setQid(response.client_id)
  }

//Listens to the toggle switch `on` state variable and cyles the qid with the other measure
useEffect(() => {
  const cycleQid = async () => {
    if (state) {
      getQid(state)
    }
  }
  cycleQid()
  }
, [on])

// Embed iframe builder, listens to changes in the qid (Which currently only changes on pageload)
const embedCtrRef =  useCallback((el) => {
  const hostUrl = extensionSDK.lookerHostData.hostUrl
  if (el && hostUrl && qid) {
    el.innerHTML = ''
    LookerEmbedSDK.init(hostUrl)
    LookerEmbedSDK.createExploreWithUrl(`${hostUrl}/embed/query/join20/order_items?qid=${qid}&sdk=2&embed_domain=${hostUrl}&sandboxed_host=true`)
      .appendTo(el)
      .on('drillmenu:click',(e) => {console.log(e)})
      .build() 
      .connect()
      .then(setExplore)
      .catch((error) => {
        console.error('Connection error', error)
      })
  }
},[qid])

  return (
    <>
      <ComponentsProvider>
        <div style={{ backgroundColor:'#262D33', padding:'10px', height:'100%'}}>
        <Flex flexDirection="row" mr="small">
        <FlexItem>
          <SpaceVertical m={2} >
            <Heading style={{color:'#fff', fontWeight:'bold', fontFamily:'Arial'}}>Best Customers by Region</Heading> 
          </SpaceVertical>
        </FlexItem>

        </Flex>
          <Flex flexDirection="row" mr="large">
            <FlexItem maxWidth="200" maxHeight="800">
              <Card raised>
                <CardContent style={{overflow:'scroll'}} >
                  <Tree label="Regions" icon="Hamburger" defaultOpen style={{ overflow: 'hidden'}} >
                    {geos}
                  </Tree> 
                </CardContent>
              </Card>
              <div style={{color:'#fff', paddingTop:'5px', paddingBottom:'0px'}}>
            By Volume <ToggleSwitch onChange={(event)=>setOn(event.target.checked)} on={on} id="switch" /> By Profit
        </div>
            </FlexItem>
          <Space />
          <FlexItem minWidth="80%" maxWidth="100%" maxHeight="800">
            <div>
              <Card raised elevation={3}>
              <EmbedContainer ref={embedCtrRef} />
              </Card>
            </div>
          </FlexItem>
        </Flex>
        </div>
      </ComponentsProvider>
    </>
  )
}


