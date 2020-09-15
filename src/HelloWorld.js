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
import { ComponentsProvider, Card, CardContent, Flex, FlexItem, Tree, TreeItem, Space, SpaceVertical, Heading} from '@looker/components'
import { ExtensionContext } from '@looker/extension-sdk-react'
import { LookerEmbedSDK, LookerEmbedLook } from '@looker/embed-sdk'
import styled from "styled-components"

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
            return  <TreeItem onClick={async () => { getQid(state['users.state']) }} icon="FieldLocation"> 
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
  const getQid = async (state) => {
    let visconfig = {
      "series_types": {},
      "type": "looker_map",
      "map_plot_mode": "points",
      "heatmap_gridlines": false,
      "heatmap_gridlines_empty": false,
      "heatmap_opacity": 0.5,
      "show_region_field": true,
      "draw_map_labels_above_data": true,
      "map_tile_provider": "light",
      "map_position": "fit_data",
      "map_scale_indicator": "off",
      "map_pannable": true,
      "map_zoomable": true,
      "map_marker_type": "circle",
      "map_marker_icon_name": "default",
      "map_marker_radius_mode": "proportional_value",
      "map_marker_units": "meters",
      "map_marker_proportional_scale_type": "linear",
      "map_marker_color_mode": "fixed",
      "show_view_names": false,
      "show_legend": true,
      "quantize_map_value_colors": false,
      "reverse_map_value_colors": false,
      "defaults_version": 1
    }
    const response = await core40SDK.ok(
        core40SDK.create_query({
                              view:'order_items',
                              model:'join20',
                              fields:['users.location', 'order_items.count'],
                              filters:{'users.state':state}, 
                              vis_config: visconfig 
                            })
                          )
    setQid(response.client_id)
  }
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
        .then()
        .catch((error) => {
          console.error('Connection error', error)
        })
    }
  },[qid])

  return (
    <>
      <ComponentsProvider>
        <div style={{ backgroundColor:'#A9AAC7', padding:'10px', height:'100%'}}>
        <SpaceVertical m={5} ><Heading style={{color:'#404263', fontWeight:'bold', fontFamily:'Arial'}}>State Sales Explorer</Heading></SpaceVertical>
       
          <Flex flexDirection="row" mr="large">
            <FlexItem maxWidth="200" maxHeight="800">
              <Card raised>
                <CardContent style={{overflow:'scroll'}} >
                  <Tree label="Regions" icon="Hamburger" defaultOpen >
                    {geos}
                  </Tree> 
                </CardContent>
              </Card>
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


